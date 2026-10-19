import { AppModule } from '@/app.module';
import { AuthService } from '@/auth/auth.service';
import { applyGlobalConfig } from '@/global-config';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import {
  clearDatabase,
  setupPrismaTests,
} from '@/shared/infrastructure/database/testing/setup-prisma-tests';
import { EnvConfigService } from '@/shared/infrastructure/env-config/env-config.service';
import { Role } from '@/users/domain/entities/role.enum';
import { JwtService } from '@nestjs/jwt';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';

describe('Authoritative authenticated identity (Fastify + PostgreSQL)', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let userId: string;
  let authorization: string;

  const schedule = (token = authorization) =>
    app.inject({
      method: 'PUT',
      url: '/api/v1/appointments/availability/me/schedule',
      headers: { authorization: token },
      payload: {
        schedules: [{ dayOfWeek: 1, startMinute: 540, endMinute: 1020 }],
      },
    });

  beforeAll(async () => {
    setupPrismaTests();
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication<NestFastifyApplication>(
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
    const created = await app.inject({
      method: 'POST',
      url: '/api/v1/users',
      payload: {
        name: 'Current Barber',
        email: 'current@example.com',
        password: 'secure-password',
        role: 'barber',
      },
    });
    expect(created.statusCode).toBe(201);
    userId = created.json().data.id;
    const login = await app.inject({
      method: 'POST',
      url: '/api/v1/users/login',
      payload: {
        email: 'current@example.com',
        password: 'secure-password',
      },
    });
    expect(login.statusCode).toBe(201);
    authorization = `Bearer ${login.json().accessToken}`;
  });
  afterEach(() => jest.restoreAllMocks());
  afterAll(async () => {
    if (prisma) await clearDatabase(prisma);
    if (app) await app.close();
  });

  it('allows the new owner to configure schedules using the original barber token', async () => {
    const created = await app.inject({
      method: 'POST',
      url: '/api/v1/barber-shops',
      headers: { authorization },
      payload: {
        name: 'Current Shop',
        address: 'Rua Central, 100, Sao Paulo - SP',
        timezone: 'America/Sao_Paulo',
      },
    });
    expect(created.statusCode).toBe(201);
    expect((await schedule()).statusCode).toBe(200);
    const service = await app.inject({
      method: 'POST',
      url: '/api/v1/services',
      headers: { authorization },
      payload: {
        name: 'Corte',
        description: 'Corte completo',
        price: 60,
        duration: 45,
      },
    });
    expect(service.statusCode).toBe(201);
    const me = await app.inject({
      method: 'GET',
      url: '/api/v1/users/me',
      headers: { authorization },
    });
    expect(me.json().data.role).toBe('owner');
  });

  it('revokes owner permission immediately after the current role changes', async () => {
    await prisma.user.update({
      where: { id: userId },
      data: { role: Role.owner },
    });
    const token = await app
      .get(AuthService)
      .generateJwt(
        userId,
        Role.owner,
        app.get(JwtService).decode(authorization.slice(7)).sid,
        new Date(Date.now() + 900000),
      );
    await prisma.user.update({
      where: { id: userId },
      data: { role: Role.client },
    });
    expect((await schedule(`Bearer ${token.accessToken}`)).statusCode).toBe(
      403,
    );
  });

  it('ignores an owner claim when the persisted identity is a barber', async () => {
    const token = await app
      .get(AuthService)
      .generateJwt(
        userId,
        Role.owner,
        app.get(JwtService).decode(authorization.slice(7)).sid,
        new Date(Date.now() + 900000),
      );
    expect((await schedule(`Bearer ${token.accessToken}`)).statusCode).toBe(
      403,
    );
  });

  it('rejects tokens for deleted identities with 401', async () => {
    await prisma.user.delete({ where: { id: userId } });
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/users/me',
      headers: { authorization },
    });
    expect(response.statusCode).toBe(401);
  });

  it('rejects a signed token without a valid identity', async () => {
    const token = await app.get(JwtService).signAsync({ role: Role.owner });
    expect((await schedule(`Bearer ${token}`)).statusCode).toBe(401);
  });

  it.each(['invalid-signature', 'expired', 'missing'])(
    'rejects %s credentials',
    async (kind) => {
      const secret = app.get(EnvConfigService).getJwtSecret();
      const token =
        kind === 'expired'
          ? await app
              .get(JwtService)
              .signAsync(
                { id: userId, role: Role.owner },
                { secret, expiresIn: -1 },
              )
          : 'invalid.token.signature';
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/users/me',
        headers: kind === 'missing' ? {} : { authorization: `Bearer ${token}` },
      });
      expect(response.statusCode).toBe(401);
    },
  );
});
