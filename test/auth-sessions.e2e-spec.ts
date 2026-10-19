import { AppModule } from '@/app.module';
import { applyGlobalConfig } from '@/global-config';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import {
  clearDatabase,
  setupPrismaTests,
} from '@/shared/infrastructure/database/testing/setup-prisma-tests';
import { EnvConfigService } from '@/shared/infrastructure/env-config/env-config.service';
import { JwtService } from '@nestjs/jwt';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';

describe('Persistent sessions (real Fastify + PostgreSQL)', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let userId: string;
  const credentials = {
    email: 'session@example.com',
    password: 'secure-password',
  };
  const login = () =>
    app.inject({
      method: 'POST',
      url: '/api/v1/users/login',
      payload: credentials,
    });
  const cookie = (r: any) => String(r.headers['set-cookie']).split(';')[0];
  const me = (token: string) =>
    app.inject({
      method: 'GET',
      url: '/api/v1/users/me',
      headers: { authorization: `Bearer ${token}` },
    });
  const refresh = (c: string, sid?: string) =>
    app.inject({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      headers: { cookie: c, 'x-barber-session': '1' },
      payload: sid ? { sessionId: sid } : {},
    });
  const logout = (c: string, sid: string) =>
    app.inject({
      method: 'POST',
      url: '/api/v1/auth/logout',
      headers: { cookie: c, 'x-barber-session': '1' },
      payload: { sessionId: sid },
    });
  beforeAll(async () => {
    setupPrismaTests();
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = module.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
      { logger: false },
    );
    applyGlobalConfig(app, app.get(EnvConfigService));
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
    prisma = app.get(PrismaService);
  });
  beforeEach(async () => {
    await clearDatabase(prisma);
    const user = await app.inject({
      method: 'POST',
      url: '/api/v1/users',
      payload: { name: 'Session client', ...credentials, role: 'client' },
    });
    expect(user.statusCode).toBe(201);
    userId = user.json().data.id;
  });
  afterEach(() => jest.restoreAllMocks());
  afterAll(async () => {
    if (prisma) await clearDatabase(prisma);
    if (app) await app.close();
  });
  it('login establishes a private per-session cookie and bounded access token, preserving raw JSON', async () => {
    const response = await login();
    const body = response.json();
    expect(response.statusCode).toBe(201);
    expect(body).toMatchObject({
      sessionId: expect.any(String),
      accessToken: expect.any(String),
      sessionExpiresAt: expect.any(String),
      accessTokenExpiresAt: expect.any(String),
    });
    expect(response.headers['set-cookie']).toContain(
      `barber_refresh_${body.sessionId}=`,
    );
    expect(response.headers['set-cookie']).toContain('HttpOnly');
    expect(response.headers['set-cookie']).toContain('SameSite=Lax');
    expect(response.headers['set-cookie']).toContain('Path=/api/v1/auth');
    expect(app.get(JwtService).decode(body.accessToken)).toMatchObject({
      id: userId,
      sid: body.sessionId,
    });
    expect(
      Date.parse(body.accessTokenExpiresAt) - Date.now(),
    ).toBeLessThanOrEqual(900000);
    expect((await me(body.accessToken)).statusCode).toBe(200);
  });
  it('rotates without extending expiry, detects replay and commits revocation of only that session', async () => {
    const a = await login(),
      b = await login();
    const rotated = await refresh(cookie(a), a.json().sessionId);
    expect(rotated.statusCode).toBe(200);
    expect(cookie(rotated)).not.toBe(cookie(a));
    expect(rotated.json().sessionExpiresAt).toBe(a.json().sessionExpiresAt);
    const replay = await refresh(cookie(a), a.json().sessionId);
    expect(replay.statusCode).toBe(401);
    expect(replay.json().code).toBe('AUTH_SESSION_INVALID');
    expect((await me(rotated.json().accessToken)).statusCode).toBe(401);
    expect((await me(b.json().accessToken)).statusCode).toBe(200);
  });
  it('does not revoke a known session when supplied random garbage', async () => {
    const a = await login(),
      sid = a.json().sessionId;
    expect(
      (await refresh(`barber_refresh_${sid}=${'a'.repeat(43)}`, sid))
        .statusCode,
    ).toBe(401);
    expect((await me(a.json().accessToken)).statusCode).toBe(200);
  });
  it('admits at most one consumer of the same refresh token under concurrency', async () => {
    const a = await login();
    const results = await Promise.all([
      refresh(cookie(a), a.json().sessionId),
      refresh(cookie(a), a.json().sessionId),
    ]);
    expect(results.map((r) => r.statusCode).sort()).toEqual([200, 401]);
    expect(
      (await me(results.find((r) => r.statusCode === 200).json().accessToken))
        .statusCode,
    ).toBe(401);
  });
  it('restores the only active cookie; refuses ambiguous bootstrap and never falls back from explicit SID', async () => {
    const a = await login();
    const restored = await refresh(cookie(a));
    expect(restored.statusCode).toBe(200);
    const b = await login();
    const cookies = `${cookie(restored)}; ${cookie(b)}`;
    const ambiguous = await refresh(cookies);
    expect(ambiguous.statusCode).toBe(401);
    expect(ambiguous.json()).toMatchObject({
      code: 'AUTH_SESSION_AMBIGUOUS',
      sessionIds: expect.arrayContaining([
        a.json().sessionId,
        b.json().sessionId,
      ]),
    });
    expect(ambiguous.json().sessionIds).toHaveLength(2);
    expect(ambiguous.headers['set-cookie']).toBeUndefined();
    expect(JSON.stringify(ambiguous.json())).not.toContain(credentials.email);
    expect((await refresh(cookie(b), a.json().sessionId)).statusCode).toBe(401);
    expect((await me(b.json().accessToken)).statusCode).toBe(200);
  });
  it('logout is idempotent, accepts consumed cookie proof, clears only target SID and immediately rejects its JWT', async () => {
    const a = await login(),
      b = await login();
    const rotated = await refresh(cookie(a), a.json().sessionId);
    const result = await logout(
      `${cookie(a)}; ${cookie(b)}`,
      a.json().sessionId,
    );
    expect(result.statusCode).toBe(204);
    expect(result.headers['set-cookie']).toContain(
      `barber_refresh_${a.json().sessionId}=`,
    );
    expect(result.headers['set-cookie']).not.toContain(b.json().sessionId);
    expect((await logout(cookie(a), a.json().sessionId)).statusCode).toBe(204);
    expect((await me(rotated.json().accessToken)).statusCode).toBe(401);
    expect((await me(b.json().accessToken)).statusCode).toBe(200);
  });
  it('rejects legacy JWTs and marks guard failures separately from authorization', async () => {
    const legacy = await app
      .get(JwtService)
      .signAsync({ id: userId, role: 'client' });
    const response = await me(legacy);
    expect(response.statusCode).toBe(401);
    expect(response.json().code).toBe('AUTHENTICATION_REQUIRED');
  });
  it('password change revokes every session including current', async () => {
    const a = await login(),
      b = await login();
    const result = await app.inject({
      method: 'PATCH',
      url: `/api/v1/users/${userId}`,
      headers: { authorization: `Bearer ${a.json().accessToken}` },
      payload: {
        oldPassword: credentials.password,
        password: 'changed-password',
      },
    });
    expect(result.statusCode).toBe(200);
    expect((await me(a.json().accessToken)).statusCode).toBe(401);
    expect((await me(b.json().accessToken)).statusCode).toBe(401);
    expect((await refresh(cookie(b))).statusCode).toBe(401);
  });
  it.each(['foreign', 'null', 'browser-no-origin', 'missing-header'])(
    'rejects unsafe refresh origin/header: %s',
    async (kind) => {
      const a = await login();
      const headers: any = { cookie: cookie(a), 'x-barber-session': '1' };
      if (kind === 'foreign') headers.origin = 'https://evil.example';
      if (kind === 'null') headers.origin = 'null';
      if (kind === 'browser-no-origin') headers['sec-fetch-site'] = 'same-site';
      if (kind === 'missing-header') delete headers['x-barber-session'];
      const result = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/refresh',
        headers,
        payload: { sessionId: a.json().sessionId },
      });
      expect(result.statusCode).toBe(403);
      expect(result.json().code).toBe('AUTH_ORIGIN_REJECTED');
      expect((await me(a.json().accessToken)).statusCode).toBe(200);
    },
  );

  it('renews an expired access token while the absolute session is active, but rejects expired sessions', async () => {
    const a = await login(),
      sid = a.json().sessionId;
    const expired = await app
      .get(JwtService)
      .signAsync({ id: userId, sid, role: 'client' }, { expiresIn: -1 });
    expect((await me(expired)).json().code).toBe('AUTHENTICATION_REQUIRED');
    const renewed = await refresh(cookie(a), sid);
    expect(renewed.statusCode).toBe(200);
    await prisma.authSession.update({
      where: { id: sid },
      data: { expiresAt: new Date(0) },
    });
    expect((await me(renewed.json().accessToken)).statusCode).toBe(401);
    const invalid = await refresh(cookie(renewed), sid);
    expect(invalid.statusCode).toBe(401);
    expect(invalid.headers['set-cookie']).toContain(`barber_refresh_${sid}=;`);
    expect(invalid.headers['set-cookie']).toContain('Max-Age=0');
  });
  it('limits access TTL and cookie expiry to the original absolute deadline with configurable TTL', async () => {
    // The use case is constructed at startup; a short persisted deadline exercises JWT/cookie limits on refresh.
    const a = await login(),
      sid = a.json().sessionId;
    const deadline = new Date(Date.now() + 60000);
    await prisma.authSession.update({
      where: { id: sid },
      data: { expiresAt: deadline },
    });
    const renewed = await refresh(cookie(a), sid);
    expect(renewed.statusCode).toBe(200);
    expect(Date.parse(renewed.json().accessTokenExpiresAt)).toBeLessThanOrEqual(
      deadline.getTime(),
    );
    expect(renewed.json().sessionExpiresAt).toBe(deadline.toISOString());
    expect(
      Number(/Max-Age=(\d+)/.exec(String(renewed.headers['set-cookie']))[1]),
    ).toBeLessThanOrEqual(60);
  });
  it.each(['https://evil.example', 'null', 'missing'])(
    'rejects unsafe browser login origin %s before creating a session',
    async (origin) => {
      const headers: any =
        origin === 'missing' ? { 'sec-fetch-site': 'same-site' } : { origin };
      const result = await app.inject({
        method: 'POST',
        url: '/api/v1/users/login',
        headers,
        payload: credentials,
      });
      expect(result.statusCode).toBe(403);
      expect(await prisma.authSession.count()).toBe(0);
      expect(result.headers['set-cookie']).toBeUndefined();
    },
  );
  it('accepts allowlisted browser requests, rotates HttpOnly cookie and exposes credentialed CORS', async () => {
    const a = await app.inject({
      method: 'POST',
      url: '/api/v1/users/login',
      headers: {
        origin: 'http://localhost:3000',
        'sec-fetch-site': 'same-site',
      },
      payload: credentials,
    });
    expect(a.statusCode).toBe(201);
    const b = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      headers: {
        origin: 'http://localhost:3000',
        'sec-fetch-site': 'same-site',
        'x-barber-session': '1',
        cookie: cookie(a),
      },
      payload: { sessionId: a.json().sessionId },
    });
    expect(b.statusCode).toBe(200);
    expect(b.headers['access-control-allow-origin']).toBe(
      'http://localhost:3000',
    );
    expect(b.headers['access-control-allow-credentials']).toBe('true');
    expect(b.headers['cache-control']).toBe('no-store');
  });
  it('garbage logout cannot revoke a known SID and duplicate cookies never select an identity', async () => {
    const a = await login(),
      sid = a.json().sessionId;
    expect(
      (await logout(`barber_refresh_${sid}=${'x'.repeat(43)}`, sid)).statusCode,
    ).toBe(204);
    expect((await me(a.json().accessToken)).statusCode).toBe(200);
    expect((await refresh(`${cookie(a)}; ${cookie(a)}`, sid)).statusCode).toBe(
      401,
    );
    expect((await me(a.json().accessToken)).statusCode).toBe(200);
  });
  it('does not choose orphaned cookie and does not clear other session cookies on an invalid explicit SID', async () => {
    const a = await login(),
      sid = a.json().sessionId,
      orphan = '11111111-1111-4111-8111-111111111111';
    const cookies = `${cookie(a)}; barber_refresh_${orphan}=${'x'.repeat(43)}`;
    const result = await refresh(cookies);
    expect(result.statusCode).toBe(200);
    expect(result.json().sessionId).toBe(sid);
    const failed = await refresh(cookie(result), orphan);
    expect(failed.statusCode).toBe(401);
    expect(failed.headers['set-cookie']).not.toContain(sid);
  });

  it('sets Secure when configured without exposing usable refresh material in JSON or persistence', async () => {
    jest
      .spyOn(app.get(EnvConfigService), 'getAuthCookieSecure')
      .mockReturnValue(true);
    const a = await login();
    expect(a.headers['set-cookie']).toContain('; Secure');
    const token = cookie(a).split('=')[1];
    expect(JSON.stringify(a.json())).not.toContain(token);
    const stored = await prisma.authRefreshToken.findMany();
    expect(stored).toHaveLength(1);
    expect(stored[0].hash).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.stringify(stored)).not.toContain(token);
  });
  it('refuses logout from foreign origin without clearing cookies or revoking the session', async () => {
    const a = await login();
    const result = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/logout',
      headers: {
        cookie: cookie(a),
        origin: 'https://evil.example',
        'x-barber-session': '1',
      },
      payload: { sessionId: a.json().sessionId },
    });
    expect(result.statusCode).toBe(403);
    expect(result.headers['set-cookie']).toBeUndefined();
    expect((await me(a.json().accessToken)).statusCode).toBe(200);
  });
  it('detects consumed-cookie replay without explicit SID rather than silently restoring another identity', async () => {
    const a = await login();
    expect((await refresh(cookie(a))).statusCode).toBe(200);
    expect((await refresh(cookie(a))).statusCode).toBe(401);
    expect((await me(a.json().accessToken)).statusCode).toBe(401);
  });
  it('serves credentialed preflight for the explicit allowed origin', async () => {
    const result = await app.inject({
      method: 'OPTIONS',
      url: '/api/v1/auth/refresh',
      headers: {
        origin: 'http://localhost:3000',
        'access-control-request-method': 'POST',
        'access-control-request-headers': 'content-type,x-barber-session',
      },
    });
    expect(result.statusCode).toBe(204);
    expect(result.headers['access-control-allow-credentials']).toBe('true');
    expect(result.headers['access-control-allow-origin']).toBe(
      'http://localhost:3000',
    );
    expect(result.headers['access-control-allow-headers']).toContain(
      'X-Barber-Session',
    );
  });
});
