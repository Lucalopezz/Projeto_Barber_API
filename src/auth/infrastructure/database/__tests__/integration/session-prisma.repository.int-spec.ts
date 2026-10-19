import { randomUUID, createHash } from 'node:crypto';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import {
  setupPrismaTests,
  clearDatabase,
} from '@/shared/infrastructure/database/testing/setup-prisma-tests';
import { SessionPrismaRepository } from '../../session-prisma.repository';
import { UserPrismaRepository } from '@/users/infrastructure/database/prisma/repositories/user-prisma.repository';

describe('Session persistence atomicity (PostgreSQL)', () => {
  const prisma = new PrismaService();
  const repository = new SessionPrismaRepository(prisma);
  const now = new Date('2026-10-19T12:00:00Z');
  let userId: string;
  const hash = (value: string) =>
    createHash('sha256').update(value).digest('hex');
  const create = async () => {
    const session = {
      id: randomUUID(),
      userId,
      createdAt: now,
      expiresAt: new Date(now.getTime() + 60000),
      revokedAt: null,
    };
    return repository.create(session, hash('initial'), 'old-hash');
  };
  beforeAll(() => setupPrismaTests());
  beforeEach(async () => {
    await clearDatabase(prisma);
    userId = (
      await prisma.user.create({
        data: {
          name: 'Session',
          email: 'atomic@example.com',
          password: 'old-hash',
          role: 'client',
        },
      })
    ).id;
  });
  afterEach(() => jest.restoreAllMocks());
  afterAll(async () => {
    await clearDatabase(prisma);
    await prisma.$disconnect();
  });
  it('stores verifier only; rejects at the exact absolute expiration boundary', async () => {
    const session = await create();
    expect(
      await repository.active(
        session.id,
        userId,
        new Date(session.expiresAt.getTime() - 1),
      ),
    ).not.toBeNull();
    expect(
      await repository.active(session.id, userId, session.expiresAt),
    ).toBeNull();
    expect(
      await repository.rotate(
        { sessionId: session.id, hash: hash('initial') },
        hash('next'),
        session.expiresAt,
      ),
    ).toBeNull();
    const stored = await prisma.authRefreshToken.findMany();
    expect(stored).toHaveLength(1);
    expect(stored[0].hash).toBe(hash('initial'));
    expect(JSON.stringify(stored)).not.toContain('initial');
  });
  it('rolls back password update if revoking sessions fails', async () => {
    const session = await create();
    const users = new UserPrismaRepository(prisma);
    const user = await users.findById(userId);
    user.updatePassword('new-hash');
    const original = prisma.$transaction.bind(prisma);
    jest.spyOn(prisma, '$transaction').mockImplementation(((callback: any) =>
      original(async (tx: any) =>
        callback(
          new Proxy(tx, {
            get(target, key) {
              if (key === 'authSession')
                return {
                  ...target.authSession,
                  updateMany: () => {
                    throw new Error('persistence failure');
                  },
                };
              return target[key];
            },
          }),
        ),
      )) as any);
    await expect(
      users.updatePasswordAndRevoke(user, 'old-hash'),
    ).rejects.toThrow('persistence failure');
    expect(
      (await prisma.user.findUnique({ where: { id: userId } })).password,
    ).toBe('old-hash');
    expect(
      (await prisma.authSession.findUnique({ where: { id: session.id } }))
        .revokedAt,
    ).toBeNull();
  });
  it('refuses a login validated against the password hash preceding a concurrent change', async () => {
    const users = new UserPrismaRepository(prisma);
    const user = await users.findById(userId);
    user.updatePassword('new-hash');
    await users.updatePasswordAndRevoke(user, 'old-hash');
    expect(await create()).toBeNull();
    expect(await prisma.authSession.count()).toBe(0);
  });
  it('serializes in-flight login creation behind a password transaction using the same user row lock', async () => {
    let locked!: () => void;
    const acquired = new Promise<void>((r) => (locked = r));
    let release!: () => void;
    const barrier = new Promise<void>((r) => (release = r));
    const mutation = prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "User" WHERE id=${userId} FOR UPDATE`;
      locked();
      await barrier;
      await tx.user.update({
        where: { id: userId },
        data: { password: 'new-hash' },
      });
      await tx.authSession.updateMany({
        where: { userId },
        data: { revokedAt: now },
      });
    });
    await acquired;
    const pending = create();
    release();
    await mutation;
    expect(await pending).toBeNull();
    expect(await prisma.authSession.count()).toBe(0);
  });
  it('does not restore a stale password or role when an in-flight profile update completes later', async () => {
    const users = new UserPrismaRepository(prisma);
    const staleProfile = await users.findById(userId);
    const changing = await users.findById(userId);
    changing.updatePassword('new-hash');
    expect(await users.updatePasswordAndRevoke(changing, 'old-hash')).toBe(
      true,
    );
    await prisma.user.update({
      where: { id: userId },
      data: { role: 'barber' },
    });
    staleProfile.update('Updated profile');
    await users.update(staleProfile);
    const persisted = await prisma.user.findUnique({ where: { id: userId } });
    expect(persisted.password).toBe('new-hash');
    expect(persisted.role).toBe('barber');
    expect(persisted.name).toBe('Updated profile');
    expect(await create()).toBeNull();
  });
  it('retains independent sessions and commits revocation caused by proven replay', async () => {
    const a = await create(),
      b = await create();
    expect(
      await repository.rotate(
        { sessionId: a.id, hash: hash('initial') },
        hash('next'),
        now,
      ),
    ).not.toBeNull();
    expect(
      await repository.rotate(
        { sessionId: a.id, hash: hash('initial') },
        hash('other'),
        now,
      ),
    ).toBeNull();
    expect(
      (await prisma.authSession.findUnique({ where: { id: a.id } })).revokedAt,
    ).toEqual(now);
    expect(await repository.active(b.id, userId, now)).not.toBeNull();
  });
});
