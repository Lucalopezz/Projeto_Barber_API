import { Role } from '@/users/domain/entities/role.enum';

export type SessionRecord = {
  id: string;
  userId: string;
  createdAt: Date;
  expiresAt: Date;
  revokedAt: Date | null;
};
export type SessionIdentity = SessionRecord & { role: Role };
export type RefreshProof = { sessionId: string; hash: string };
export interface SessionRepository {
  create(
    session: SessionRecord,
    hash: string,
    expectedPasswordHash: string,
  ): Promise<SessionIdentity | null>;
  active(
    sessionId: string,
    userId: string,
    now: Date,
  ): Promise<SessionIdentity | null>;
  candidates(proofs: RefreshProof[], now: Date): Promise<string[]>;
  rotate(
    proof: RefreshProof,
    nextHash: string,
  ): Promise<SessionIdentity | null>;
  revoke(proof: RefreshProof, now: Date): Promise<void>;
}
