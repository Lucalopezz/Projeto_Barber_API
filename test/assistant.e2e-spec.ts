import { Test } from '@nestjs/testing';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { JwtService } from '@nestjs/jwt';
import { AssistantController } from '@/assistant/infrastructure/assistant.controller';
import { ChatUseCase } from '@/assistant/application/usecases/chat.usecase';
import { SimulatedAssistantProvider } from '@/assistant/infrastructure/providers/simulated-assistant.provider';
import { AssistantReadTools } from '@/assistant/application/ports/assistant';
import { AuthService } from '@/auth/auth.service';
import { AuthGuard } from '@/auth/guard/auth.guard';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { EnvConfigService } from '@/shared/infrastructure/env-config/env-config.service';
import { applyGlobalConfig } from '@/global-config';
const shop = '11111111-1111-4111-8111-111111111111';
const service = '22222222-2222-4222-8222-222222222222';
describe('Assistant HTTP (real Fastify, JWT, validation; fake persistence)', () => {
  let app: NestFastifyApplication;
  let token: string;
  const tools: jest.Mocked<AssistantReadTools> = {
    searchCatalog: jest.fn(),
    listServices: jest.fn(),
    getAvailability: jest.fn(),
  };
  const findUser = jest.fn().mockResolvedValue({ id: shop, role: 'client' });
  beforeAll(async () => {
    const jwt = new JwtService({ secret: 'assistant-e2e-only-secret' });
    const config = {
      getJwtSecret: () => 'assistant-e2e-only-secret',
      getCorsAllowedOrigins: () => [],
    };
    const module = await Test.createTestingModule({
      controllers: [AssistantController],
      providers: [
        AuthGuard,
        {
          provide: ChatUseCase,
          useValue: new ChatUseCase(new SimulatedAssistantProvider(), tools),
        },
        {
          provide: AuthService,
          useValue: new AuthService(jwt, config as unknown as EnvConfigService),
        },
        {
          provide: PrismaService,
          useValue: { user: { findUnique: findUser } },
        },
      ],
    }).compile();
    app = module.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
      { logger: false },
    );
    applyGlobalConfig(app, config as unknown as EnvConfigService);
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
    token = jwt.sign({ id: shop });
  });
  afterAll(async () => app?.close());
  beforeEach(() => {
    jest.clearAllMocks();
    tools.searchCatalog.mockResolvedValue({ items: [], total: 0 });
  });
  const send = (payload: unknown, auth = token) =>
    app.inject({
      method: 'POST',
      url: '/api/v1/assistant/chat',
      headers: auth ? { authorization: `Bearer ${auth}` } : {},
      payload: payload as object,
    });
  it.each(['', 'invalid'])(
    'rejects absent or invalid JWT (%s)',
    async (auth) => {
      expect((await send({ message: 'barbearias' }, auth)).statusCode).toBe(
        401,
      );
      expect(tools.searchCatalog).not.toHaveBeenCalled();
    },
  );
  it('returns the standard data envelope, actual tool trace and simulated provider', async () => {
    const response = await send({ message: 'barbearias' });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      data: {
        answer: 'Nenhuma barbearia encontrada. Tente outro nome.',
        provider: 'simulated',
        toolCalls: [
          {
            name: 'search_catalog',
            arguments: { filter: '' },
            result: { items: [], total: 0 },
          },
        ],
      },
    });
  });
  it.each([
    { message: '' },
    { message: '   ' },
    { message: 'x'.repeat(1001) },
    { message: 'horários', context: { barberShopId: 'not-uuid' } },
    { message: 'horários', context: { date: '2026-02-30' } },
    { message: 'barbearias', context: { admin: true } },
    { message: 'barbearias', history: [] },
    { message: 'barbearias', context: 'wrong' },
  ])('rejects invalid bodies before executing tools (%j)', async (payload) => {
    expect((await send(payload)).statusCode).toBe(422);
    expect(tools.searchCatalog).not.toHaveBeenCalled();
    expect(tools.getAvailability).not.toHaveBeenCalled();
  });
  it('rejects deleted accounts through the unchanged real guard', async () => {
    findUser.mockResolvedValueOnce(null);
    expect((await send({ message: 'barbearias' })).statusCode).toBe(401);
  });
  it('mutation requests do not execute tools', async () => {
    const response = await send({ message: 'Cancele minha reserva' });
    expect(response.statusCode).toBe(200);
    expect(response.json().data.toolCalls).toEqual([]);
  });
  it('returns safe tool failure without leaking internals', async () => {
    tools.getAvailability.mockRejectedValueOnce(
      new Error('postgres secret password'),
    );
    const response = await send({
      message: 'Horários',
      context: { barberShopId: shop, serviceId: service, date: '2026-12-01' },
    });
    expect(response.statusCode).toBe(200);
    expect(response.body).not.toContain('secret');
    expect(response.json().data.toolCalls).toEqual([]);
  });
});
