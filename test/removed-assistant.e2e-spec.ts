import { Test } from '@nestjs/testing';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { AppModule } from '@/app.module';
import { AuthService } from '@/auth/auth.service';
import { applyGlobalConfig } from '@/global-config';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { EnvConfigService } from '@/shared/infrastructure/env-config/env-config.service';
import { createOpenApiDocument } from '@/shared/infrastructure/openapi/openapi';
import { GetUserUseCase } from '@/users/application/usecases/get-user.usecase';
import { Role } from '@/users/domain/entities/role.enum';

describe('Removed assistant (AppModule and real Fastify, fake persistence)', () => {
  let app: NestFastifyApplication;
  let token: string;
  const user = {
    id: '11111111-1111-4111-8111-111111111111',
    name: 'Cliente',
    email: 'cliente@example.com',
    role: Role.client,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    barberShop: null,
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue({ user: { findUnique: jest.fn().mockResolvedValue(user) } })
      .overrideProvider('PrismaService')
      .useValue({ user: { findUnique: jest.fn().mockResolvedValue(user) } })
      .overrideProvider(GetUserUseCase.UseCase)
      .useValue({ execute: jest.fn().mockResolvedValue(user) })
      .compile();
    app = moduleRef.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
      { logger: false },
    );
    applyGlobalConfig(app, app.get(EnvConfigService));
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
    token = (await app.get(AuthService).generateJwt(user.id, user.role))
      .accessToken;
  });

  afterAll(async () => app?.close());

  it('returns 404 for the former route with credentials accepted by the real guard', async () => {
    const headers = { authorization: `Bearer ${token}` };
    const authenticated = await app.inject({
      method: 'GET',
      url: '/api/v1/users/me',
      headers,
    });
    expect(authenticated.statusCode).toBe(200);
    expect(authenticated.json().data.id).toBe(user.id);

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/assistant/chat',
      headers,
      payload: { message: 'Cancele minha reserva' },
    });
    expect(response.statusCode).toBe(404);
  });

  it('omits the removed feature from the generated OpenAPI contract', () => {
    const document = createOpenApiDocument(app);
    expect(Object.keys(document.paths)).not.toEqual(
      expect.arrayContaining([expect.stringContaining('/assistant')]),
    );
    expect(Object.keys(document.components?.schemas ?? {})).not.toEqual(
      expect.arrayContaining(['ChatDto', 'ChatPresenter']),
    );
    expect(
      document.paths['/api/v1/barber-shops/{id}/availability']?.get,
    ).toBeDefined();
    expect(document.paths['/api/v1/appointments']?.post).toBeDefined();
  });
});
