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
import { CountUnreadNotificationsUseCase } from '../../../application/usecases/count-unread-notifications.usecase';
import { MarkNotificationReadUseCase } from '../../../application/usecases/mark-notification-read.usecase';
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
  const notificationId = randomUUID();
  const startsAt = new Date('2030-01-07T12:00:00.000Z');
  const createdAt = new Date('2030-01-01T10:00:00.000Z');
  const listByUser = jest.fn();
  const countUnread = jest.fn();
  const markAsRead = jest.fn();
  let storedReadAt: Date | null;
  const repository = { listByUser, countUnread, markAsRead };
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
          useFactory: () => new ListNotificationsUseCase.UseCase(repository),
        },
        {
          provide: CountUnreadNotificationsUseCase.UseCase,
          useFactory: () =>
            new CountUnreadNotificationsUseCase.UseCase(repository),
        },
        {
          provide: MarkNotificationReadUseCase.UseCase,
          useFactory: () => new MarkNotificationReadUseCase.UseCase(repository),
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
    storedReadAt = null;
    active.mockImplementation(async (_sid, userId) => ({
      userId,
      role: userId === professionalId ? 'barber' : 'client',
    }));
    countUnread.mockImplementation(async (userId) =>
      userId === otherId ? 0 : userId === clientId && storedReadAt ? 1 : 2,
    );
    markAsRead.mockImplementation(async (userId, id, readAt) => {
      if (userId !== clientId || id !== notificationId) return null;
      storedReadAt ??= readAt;
      return new NotificationEntity(
        {
          userId,
          appointmentId,
          eventKey: 'created-event',
          type: NotificationType.appointmentCreated,
          serviceName: 'Corte',
          barberShopName: 'Barbearia Escola',
          startsAt,
          timezone: 'America/Sao_Paulo',
          createdAt,
          readAt: storedReadAt,
        },
        notificationId,
      );
    });
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

  it('expõe a contagem autenticada de não lidas no envelope canônico', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/notifications/unread-count',
      headers: { authorization: `Bearer ${clientId}` },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ data: { count: 2 } });
    expect(countUnread).toHaveBeenCalledWith(clientId);
  });

  it('publica leitura e contador autenticados com schemas e erros no OpenAPI', () => {
    const document = createOpenApiDocument(app);
    const count = document.paths['/api/v1/notifications/unread-count'].get;
    const read = document.paths['/api/v1/notifications/{id}/read'].patch;
    expect(count.security).toEqual([{ bearer: [] }]);
    expect(read.security).toEqual([{ bearer: [] }]);
    expect(Object.keys(count.responses)).toEqual(
      expect.arrayContaining(['200', '401']),
    );
    expect(Object.keys(read.responses)).toEqual(
      expect.arrayContaining(['200', '401', '404', '422']),
    );
    expect(read.parameters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'id',
          in: 'path',
          required: true,
          schema: expect.objectContaining({ format: 'uuid' }),
        }),
      ]),
    );
    expect(
      document.components.schemas.UnreadNotificationsCountPresenter,
    ).toEqual(expect.objectContaining({ required: ['count'] }));
    expect(document.components.schemas.NotificationPresenter).toEqual(
      expect.objectContaining({
        properties: expect.objectContaining({
          previousStartsAt: expect.objectContaining({
            nullable: true,
            format: 'date-time',
          }),
          previousServiceName: expect.objectContaining({ nullable: true }),
        }),
      }),
    );
  });

  it('permite marcar a própria notificação como lida sem expor campos internos', async () => {
    const response = await app.inject({
      method: 'PATCH',
      url: `/api/v1/notifications/${notificationId}/read`,
      headers: { authorization: `Bearer ${clientId}` },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json().data).toEqual(
      expect.objectContaining({
        id: notificationId,
        readAt: expect.any(String),
      }),
    );
    expect(response.json().data).not.toHaveProperty('userId');
    expect(response.json().data).not.toHaveProperty('eventKey');
    expect(markAsRead).toHaveBeenCalledWith(
      clientId,
      notificationId,
      expect.any(Date),
    );
  });

  it('rejeita UUID inválido na ação de leitura com 422', async () => {
    const response = await app.inject({
      method: 'PATCH',
      url: '/api/v1/notifications/invalid/read',
      headers: { authorization: `Bearer ${clientId}` },
    });
    expect(response.statusCode).toBe(422);
    expect(markAsRead).not.toHaveBeenCalled();
  });

  it('repetir a leitura mantém o primeiro timestamp e decrementa o contador uma única vez', async () => {
    const call = () =>
      app.inject({
        method: 'PATCH',
        url: `/api/v1/notifications/${notificationId}/read`,
        headers: { authorization: `Bearer ${clientId}` },
      });
    const first = await call();
    const second = await call();
    expect(first.statusCode).toBe(200);
    expect(second.statusCode).toBe(200);
    expect(second.json().data.readAt).toBe(first.json().data.readAt);
    const count = await app.inject({
      method: 'GET',
      url: '/api/v1/notifications/unread-count',
      headers: { authorization: `Bearer ${clientId}` },
    });
    expect(count.json()).toEqual({ data: { count: 1 } });
  });

  it('não aceita escolher o destinatário por query na contagem', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/notifications/unread-count?userId=${otherId}`,
      headers: { authorization: `Bearer ${clientId}` },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ data: { count: 2 } });
    expect(countUnread).toHaveBeenCalledWith(clientId);
  });

  it('outra conta recebe somente sua própria contagem', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/notifications/unread-count',
      headers: { authorization: `Bearer ${otherId}` },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ data: { count: 0 } });
    expect(countUnread).toHaveBeenCalledWith(otherId);
  });

  it.each([otherId, professionalId])(
    'não permite que outra conta marque a notificação (%s)',
    async (userId) => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/notifications/${notificationId}/read`,
        headers: { authorization: `Bearer ${userId}` },
      });
      expect(response.statusCode).toBe(404);
      expect(response.json()).toEqual({
        statusCode: 404,
        error: 'Not Found',
        message: 'Notification not found',
      });
      expect(markAsRead).toHaveBeenCalledWith(
        userId,
        notificationId,
        expect.any(Date),
      );
    },
  );

  it('ID inexistente recebe o mesmo 404 de uma notificação alheia', async () => {
    const response = await app.inject({
      method: 'PATCH',
      url: `/api/v1/notifications/${randomUUID()}/read`,
      headers: { authorization: `Bearer ${clientId}` },
    });
    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({
      statusCode: 404,
      error: 'Not Found',
      message: 'Notification not found',
    });
  });

  it.each([
    { method: 'GET' as const, url: '/api/v1/notifications/unread-count' },
    {
      method: 'PATCH' as const,
      url: `/api/v1/notifications/${notificationId}/read`,
    },
  ])(
    'protege o novo endpoint $method $url com o guard real',
    async ({ method, url }) => {
      const response = await app.inject({ method, url });
      expect(response.statusCode).toBe(401);
      expect(countUnread).not.toHaveBeenCalled();
      expect(markAsRead).not.toHaveBeenCalled();
    },
  );

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
            previousStartsAt: null,
            previousServiceName: null,
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
