import {
  SessionRepository,
  SessionRecord,
  SessionIdentity,
  RefreshProof,
} from '@/auth/domain/repositories/session.repository';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { Prisma } from '@prisma/client';
import { Role } from '@/users/domain/entities/role.enum';

export class SessionPrismaRepository implements SessionRepository {
  constructor(
    private prisma: PrismaService,
    private clock: () => Date = () => new Date(),
  ) {}
  private identity(
    session: SessionRecord & { user: { role: string } },
  ): SessionIdentity {
    const { user, ...record } = session;
    return { ...record, role: user.role as Role };
  }
  async create(
    session: SessionRecord,
    hash: string,
    expectedPasswordHash: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      // All password/session creation operations acquire the user lock first.
      await tx.$queryRaw`SELECT id FROM "User" WHERE id=${session.userId} FOR UPDATE`;
      const user = await tx.user.findUnique({ where: { id: session.userId } });
      if (!user || user.password !== expectedPasswordHash) return null;
      const model = await tx.authSession.create({
        data: { ...session, tokens: { create: { hash } } },
        include: { user: true },
      });
      return this.identity(model);
    });
  }
  async active(sessionId: string, userId: string, now: Date) {
    const session = await this.prisma.authSession.findFirst({
      where: { id: sessionId, userId, revokedAt: null, expiresAt: { gt: now } },
      include: { user: true },
    });
    return session ? this.identity(session) : null;
  }
  async candidates(proofs: RefreshProof[], now: Date) {
    if (!proofs.length) return [];
    const sessions = await this.prisma.authSession.findMany({
      where: {
        revokedAt: null,
        expiresAt: { gt: now },
        OR: proofs.map((p) => ({
          id: p.sessionId,
          tokens: { some: { hash: p.hash } },
        })),
      },
      select: { id: true },
    });
    return sessions.map((s) => s.id);
  }
  private async lock(tx: Prisma.TransactionClient, sid: string) {
    await tx.$queryRaw`SELECT id FROM "AuthSession" WHERE id=${sid} FOR UPDATE`;
  }
  async rotate(proof: RefreshProof, nextHash: string) {
    // Return null inside the transaction: throwing here would roll back replay revocation.
    return this.prisma.$transaction(async (tx) => {
      await this.lock(tx, proof.sessionId);
      const session = await tx.authSession.findUnique({
        where: { id: proof.sessionId },
        include: { user: true },
      });
      if (!session || session.revokedAt) return null;
      const token = await tx.authRefreshToken.findUnique({
        where: {
          sessionId_hash: { sessionId: proof.sessionId, hash: proof.hash },
        },
      });
      if (!token) return null;
      // Waiting for another transaction must not freeze the absolute deadline.
      const now = this.clock();
      if (session.expiresAt <= now) return null;
      if (token.consumedAt) {
        await tx.authSession.update({
          where: { id: session.id },
          data: { revokedAt: now },
        });
        return null;
      }
      await tx.authRefreshToken.update({
        where: { id: token.id },
        data: { consumedAt: now },
      });
      await tx.authRefreshToken.create({
        data: { sessionId: session.id, hash: nextHash },
      });
      return this.identity(session);
    });
  }
  async revoke(proof: RefreshProof, now: Date) {
    await this.prisma.$transaction(async (tx) => {
      await this.lock(tx, proof.sessionId);
      const token = await tx.authRefreshToken.findUnique({
        where: {
          sessionId_hash: { sessionId: proof.sessionId, hash: proof.hash },
        },
      });
      if (token)
        await tx.authSession.updateMany({
          where: { id: proof.sessionId, revokedAt: null },
          data: { revokedAt: now },
        });
    });
  }
}
