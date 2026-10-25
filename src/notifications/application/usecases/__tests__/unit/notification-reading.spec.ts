import { randomUUID } from 'node:crypto';
import { SearchResult } from '@/shared/domain/repositories/searchable.repository';
import { NotFoundError } from '@/shared/domain/errors/not-found-error';
import { NotificationEntity } from '@/notifications/domain/entities/notification.entity';
import { NotificationType } from '@/notifications/domain/entities/notification.props';
import { CountUnreadNotificationsUseCase } from '../../count-unread-notifications.usecase';
import { ListNotificationsUseCase } from '../../list-notifications.usecase';
import { MarkNotificationReadUseCase } from '../../mark-notification-read.usecase';

describe('Leitura e contagem de notificações', () => {
  const userId = randomUUID();
  const id = randomUUID();
  const firstReadAt = new Date('2030-01-01T12:00:00Z');
  const later = new Date('2030-01-02T12:00:00Z');
  const previousStartsAt = new Date('2030-01-07T12:00:00Z');
  const repository = {
    listByUser: jest.fn(),
    countUnread: jest.fn(),
    markAsRead: jest.fn(),
  };
  const count = new CountUnreadNotificationsUseCase.UseCase(repository);
  const read = new MarkNotificationReadUseCase.UseCase(repository, {
    now: () => later,
  });
  const list = new ListNotificationsUseCase.UseCase(repository);
  const entity = (withSnapshot = false) =>
    new NotificationEntity(
      {
        userId,
        appointmentId: randomUUID(),
        eventKey: 'operation-event',
        type: NotificationType.appointmentCreated,
        serviceName: 'Corte',
        barberShopName: 'Barbearia Escola',
        startsAt: new Date('2030-01-08T12:00:00Z'),
        timezone: 'America/Sao_Paulo',
        readAt: firstReadAt,
        ...(withSnapshot && { previousStartsAt, previousServiceName: 'Barba' }),
      },
      id,
    );

  beforeEach(() => jest.resetAllMocks());

  it.each([0, 3])(
    'retorna a contagem %i apenas da identidade recebida',
    async (value) => {
      repository.countUnread.mockResolvedValue(value);
      await expect(count.execute({ userId })).resolves.toEqual({
        count: value,
      });
      expect(repository.countUnread).toHaveBeenCalledWith(userId);
    },
  );

  it('propaga falha de contagem em vez de informar zero não lidas', async () => {
    repository.countUnread.mockRejectedValue(new Error('database unavailable'));
    await expect(count.execute({ userId })).rejects.toThrow(
      'database unavailable',
    );
  });

  it('solicita a leitura com identidade, ID e relógio, preservando a primeira data persistida', async () => {
    repository.markAsRead.mockResolvedValue(entity());
    const result = await read.execute({ userId, id });
    expect(repository.markAsRead).toHaveBeenCalledWith(userId, id, later);
    expect(result.readAt).toEqual(firstReadAt);
    expect(result).not.toHaveProperty('userId');
    expect(result).not.toHaveProperty('eventKey');
    expect(result.previousStartsAt).toBeNull();
    expect(result.previousServiceName).toBeNull();
  });

  it('não distingue notificação inexistente de notificação alheia', async () => {
    repository.markAsRead.mockResolvedValue(null);
    await expect(read.execute({ userId, id })).rejects.toEqual(
      new NotFoundError('Notification not found'),
    );
  });

  it('retorna snapshots anteriores ao marcar como lida', async () => {
    repository.markAsRead.mockResolvedValue(entity(true));
    const result = await read.execute({ userId, id });
    expect(result.previousStartsAt).toEqual(previousStartsAt);
    expect(result.previousServiceName).toBe('Barba');
  });

  it.each([false, true])(
    'usa o mesmo contrato de snapshots na listagem: %s',
    async (withSnapshot) => {
      repository.listByUser.mockResolvedValue(
        new SearchResult({
          items: [entity(withSnapshot)],
          total: 1,
          currentPage: 1,
          perPage: 15,
        }),
      );
      const result = await list.execute({ userId });
      expect(result.items[0].previousStartsAt).toEqual(
        withSnapshot ? previousStartsAt : null,
      );
      expect(result.items[0].previousServiceName).toEqual(
        withSnapshot ? 'Barba' : null,
      );
      expect(result.items[0]).not.toHaveProperty('userId');
      expect(result.items[0]).not.toHaveProperty('eventKey');
    },
  );
});
