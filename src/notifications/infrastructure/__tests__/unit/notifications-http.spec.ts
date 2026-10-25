import { randomUUID } from 'node:crypto';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { AuthGuard } from '@/auth/guard/auth.guard';
import { AuthService } from '@/auth/auth.service';
import { applyGlobalConfig } from '@/global-config';
import { EnvConfigService } from '@/shared/infrastructure/env-config/env-config.service';
import { createOpenApiDocument } from '@/shared/infrastructure/openapi/openapi';
import { SearchResult } from '@/shared/domain/repositories/searchable.repository';
import { ListNotificationsUseCase } from '../../../application/usecases/list-notifications.usecase';
import { NotificationEntity } from '../../../domain/entities/notification.entity';
import { NotificationType } from '../../../domain/entities/notification.props';
import { NotificationsController } from '../../notifications.controller';

describe('GET /notifications com Fastify e guard reais, sem banco', () => {
  let app: NestFastifyApplication;
  const clientId = randomUUID();
  const professionalId = randomUUID();
  const otherId = randomUUID();
  const sessionId = randomUUID();
  const appointmentId = randomUUID();
  const startsAt = new Date('2030-01-07T12:00:00.000Z');
  const createdAt = new Date('2030-01-01T10:00:00.000Z');
  const listByUser = jest.fn();
  const active = jest.fn(async (_sessionId: string, userId: string) => ({
    userId,
    role: userId === professionalId ? 'barber' : 'client',
  }));

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [NotificationsController],
      providers: [
        AuthGuard,
        {
          provide: AuthService,
          useValue: {
            verifyJwt: jest.fn(async (token: string) => {
              if (
                ![clientId, professionalId, otherId].some((id) => id === token)
              )
                throw new Error('Token inválido');
              return { id: token, sid: sessionId };
            }),
          },
        },
        { provide: 'SessionRepository', useValue: { active } },
        {
          provide: ListNotificationsUseCase.UseCase,
          useFactory: () =>
            new ListNotificationsUseCase.UseCase({ listByUser }),
        },
      ],
    }).compile();
    app = moduleRef.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
      { logger: false },
    );
    applyGlobalConfig(
      app,
      new EnvConfigService(new ConfigService({ CORS_ALLOWED_ORIGINS: '' })),
    );
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    active.mockImplementation(async (_sid, userId) => ({
      userId,
      role: userId === professionalId ? 'barber' : 'client',
    }));
    listByUser.mockImplementation(async (userId, params) => {
      const entity = new NotificationEntity({
        userId,
        appointmentId,
        eventKey: `appointment-created-${appointmentId}`,
        type: NotificationType.appointmentCreated,
        serviceName: 'Corte',
        barberShopName: 'Barbearia Escola',
        startsAt,
        timezone: 'America/Sao_Paulo',
        createdAt,
      });
      return new SearchResult({
        items: userId === otherId ? [] : [entity],
        total: userId === otherId ? 0 : 2,
        currentPage: params.page,
        perPage: params.perPage,
      });
    });
  });

  afterAll(async () => app?.close());

  it('publica a listagem autenticada e paginada no OpenAPI', () => {
    const document = createOpenApiDocument(app);
    const operation = document.paths['/api/v1/notifications'].get;
    expect(operation.operationId).toBe('NotificationsController_search');
    expect(operation.security).toEqual([{ bearer: [] }]);
    expect(operation.parameters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'page', in: 'query' }),
        expect.objectContaining({ name: 'perPage', in: 'query' }),
      ]),
    );
    expect(Object.keys(operation.responses)).toEqual(
      expect.arrayContaining(['200', '401', '422']),
    );
    expect(document.components.schemas.NotificationPresenter).toEqual(
      expect.objectContaining({
        required: expect.arrayContaining([
          'id',
          'appointmentId',
          'type',
          'startsAt',
          'timezone',
          'readAt',
        ]),
      }),
    );
  });

  it.each([clientId, professionalId])(
    'lista somente a identidade autenticada (%s) com datas e envelope canônicos',
    async (userId) => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/notifications?page=2&perPage=1',
        headers: { authorization: `Bearer ${userId}` },
      });
      expect(response.statusCode).toBe(200);
      expect(active).toHaveBeenCalledWith(sessionId, userId, expect.any(Date));
      expect(listByUser).toHaveBeenCalledWith(
        userId,
        expect.objectContaining({ _page: 2, _perPage: 1 }),
      );
      expect(response.json()).toEqual({
        data: [
          {
            id: expect.any(String),
            appointmentId,
            type: 'appointment_created',
            serviceName: 'Corte',
            barberShopName: 'Barbearia Escola',
            startsAt: startsAt.toISOString(),
            timezone: 'America/Sao_Paulo',
            createdAt: createdAt.toISOString(),
            readAt: null,
          },
        ],
        meta: { currentPage: 2, perPage: 1, lastPage: 2, total: 2 },
      });
      expect(response.json().data[0]).not.toHaveProperty('eventKey');
      expect(response.json().data[0]).not.toHaveProperty('userId');
    },
  );

  it('devolve caixa vazia de outra conta sem reaproveitar a identidade anterior', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/notifications',
      headers: { authorization: `Bearer ${otherId}` },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      data: [],
      meta: { currentPage: 1, perPage: 15, lastPage: 0, total: 0 },
    });
    expect(listByUser).toHaveBeenCalledWith(otherId, expect.anything());
  });

  it.each([undefined, 'Bearer inválido', `Basic ${clientId}`])(
    'rejeita autenticação ausente ou inválida antes de consultar notificações (%s)',
    async (authorization) => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/notifications',
        headers: authorization ? { authorization } : {},
      });
      expect(response.statusCode).toBe(401);
      expect(listByUser).not.toHaveBeenCalled();
    },
  );

  it('recusa uma sessão revogada mesmo com JWT verificado', async () => {
    active.mockResolvedValueOnce(null);
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/notifications',
      headers: { authorization: `Bearer ${clientId}` },
    });
    expect(response.statusCode).toBe(401);
    expect(listByUser).not.toHaveBeenCalled();
  });

  it.each([
    'page=0',
    'page=1.5',
    'page=abc',
    'perPage=0',
    'perPage=101',
    'perPage=abc',
    `userId=${professionalId}`,
    'sort=userId',
  ])(
    'rejeita query inválida ou tentativa de escolher outro usuário (%s)',
    async (query) => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/notifications?${query}`,
        headers: { authorization: `Bearer ${clientId}` },
      });
      expect(response.statusCode).toBe(422);
      expect(listByUser).not.toHaveBeenCalled();
    },
  );
});
