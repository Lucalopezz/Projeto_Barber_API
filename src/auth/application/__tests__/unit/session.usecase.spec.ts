import { SessionUseCase, SessionAmbiguousError } from '../../session.usecase';
import { SessionRepository } from '@/auth/domain/repositories/session.repository';

describe('Session lifecycle policy', () => {
  const now = new Date('2026-10-19T10:00:00.000Z');
  let repository: jest.Mocked<SessionRepository>;
  let usecase: SessionUseCase;
  beforeEach(() => {
    repository = {
      create: jest.fn(),
      active: jest.fn(),
      candidates: jest.fn(),
      rotate: jest.fn(),
      revoke: jest.fn(),
    };
    usecase = new SessionUseCase(
      repository,
      { id: () => 'session', token: () => 'opaque', hash: (v) => `hash:${v}` },
      604800,
      () => now,
    );
  });
  it('starts fixed absolute expiry and persists only verifier, conditional on authenticated password hash', async () => {
    repository.create.mockResolvedValue({ id: 'session' } as any);
    const result = await usecase.start('user', 'password-hash');
    expect(result.refreshToken).toBe('opaque');
    expect(repository.create).toHaveBeenCalledWith(
      {
        id: 'session',
        userId: 'user',
        createdAt: now,
        expiresAt: new Date('2026-10-26T10:00:00.000Z'),
        revokedAt: null,
      },
      'hash:opaque',
      'password-hash',
    );
  });
  it('never falls back to another cookie when the selected SID is missing', async () => {
    expect(
      await usecase.refresh(new Map([['another', 'value']]), 'selected'),
    ).toBeNull();
    expect(repository.candidates).not.toHaveBeenCalled();
    expect(repository.rotate).not.toHaveBeenCalled();
  });
  it.each([[[]]])(
    'does not silently choose from ambiguous/absent active identities %j',
    async (ids) => {
      repository.candidates.mockResolvedValue(ids as string[]);
      expect(await usecase.refresh(new Map([['a', 'token']]))).toBeNull();
      expect(repository.rotate).not.toHaveBeenCalled();
    },
  );
  it('returns only authenticated active identifiers when bootstrap is ambiguous', async () => {
    repository.candidates.mockResolvedValue(['a', 'b']);
    await expect(
      usecase.refresh(
        new Map([
          ['a', 'token'],
          ['b', 'other'],
        ]),
      ),
    ).rejects.toEqual(new SessionAmbiguousError(['a', 'b']));
    expect(repository.rotate).not.toHaveBeenCalled();
  });
  it('passes only the target cookie proof to idempotent logout', async () => {
    await usecase.logout(
      'a',
      new Map([
        ['a', 'old'],
        ['b', 'new'],
      ]),
    );
    expect(repository.revoke).toHaveBeenCalledWith(
      { sessionId: 'a', hash: 'hash:old' },
      now,
    );
  });
});
