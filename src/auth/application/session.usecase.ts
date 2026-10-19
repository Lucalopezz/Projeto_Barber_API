import {
  SessionIdentity,
  SessionRepository,
} from '../domain/repositories/session.repository';

export class SessionAmbiguousError extends Error {
  constructor(readonly sessionIds: string[]) {
    super('Multiple authenticated active session cookies');
  }
}
export interface SessionSecrets {
  id(): string;
  token(): string;
  hash(value: string): string;
}
export class SessionUseCase {
  constructor(
    private repository: SessionRepository,
    private secrets: SessionSecrets,
    private ttlSeconds: number,
    private clock: () => Date = () => new Date(),
  ) {}
  async start(userId: string, expectedPasswordHash: string) {
    const now = this.clock();
    const refreshToken = this.secrets.token();
    const session = await this.repository.create(
      {
        id: this.secrets.id(),
        userId,
        createdAt: now,
        expiresAt: new Date(now.getTime() + this.ttlSeconds * 1000),
        revokedAt: null,
      },
      this.secrets.hash(refreshToken),
      expectedPasswordHash,
    );
    return session ? { session, refreshToken } : null;
  }
  async refresh(
    cookies: Map<string, string>,
    sessionId?: string,
  ): Promise<{ session: SessionIdentity; refreshToken: string } | null> {
    let selected = sessionId;
    if (!selected) {
      const proofs = [...cookies].map(([sid, value]) => ({
        sessionId: sid,
        hash: this.secrets.hash(value),
      }));
      const ids = await this.repository.candidates(proofs, this.clock());
      if (ids.length > 1) throw new SessionAmbiguousError(ids);
      if (ids.length !== 1) return null;
      selected = ids[0];
    }
    const token = cookies.get(selected);
    if (!token) return null;
    const refreshToken = this.secrets.token();
    const session = await this.repository.rotate(
      { sessionId: selected, hash: this.secrets.hash(token) },
      this.secrets.hash(refreshToken),
      this.clock(),
    );
    return session ? { session, refreshToken } : null;
  }
  async logout(sessionId: string, cookies: Map<string, string>) {
    const token = cookies.get(sessionId);
    if (token)
      await this.repository.revoke(
        { sessionId, hash: this.secrets.hash(token) },
        this.clock(),
      );
  }
}
