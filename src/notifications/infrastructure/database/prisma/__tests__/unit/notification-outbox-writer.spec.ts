import { randomUUID } from 'node:crypto';
import { NotificationOutboxPrismaWriter } from '../../notification-outbox-prisma.repository';

describe('Chaves e snapshots dos eventos de alteração', () => {
  const create = jest.fn().mockResolvedValue(undefined);
  const writer = new NotificationOutboxPrismaWriter({
    notificationOutbox: { create },
  } as any);
  const appointmentId = randomUUID();
  const clientId = randomUUID();
  const barberId = randomUUID();
  const snapshot = {
    appointmentId,
    recipientIds: [clientId, barberId],
    serviceName: 'Barba',
    barberShopName: 'Barbearia Escola',
    startsAt: new Date('2030-01-07T14:00:00.000Z'),
    timezone: 'America/Sao_Paulo',
  };
  beforeEach(() => jest.clearAllMocks());

  it('identifica cada revisão e preserva os valores anteriores sem enviar revision ao Prisma', async () => {
    const change = {
      ...snapshot,
      previousStartsAt: new Date('2030-01-07T12:00:00.000Z'),
      previousServiceName: 'Corte',
    };
    await writer.recordUpdated({ ...change, revision: 8 });
    await writer.recordUpdated({ ...change, revision: 9 });
    expect(create.mock.calls.map(([input]) => input.data.eventKey)).toEqual([
      `appointment-updated-${appointmentId}-v8`,
      `appointment-updated-${appointmentId}-v9`,
    ]);
    expect(create.mock.calls[0][0].data).toEqual({
      ...change,
      eventKey: `appointment-updated-${appointmentId}-v8`,
      type: 'appointment_updated',
    });
  });

  it('usa o tipo e a revisão do cancelamento e deduplica destinatários', async () => {
    await writer.recordCancelled({
      ...snapshot,
      revision: 8,
      recipientIds: [clientId, clientId],
    });
    expect(create).toHaveBeenCalledWith({
      data: {
        ...snapshot,
        recipientIds: [clientId],
        eventKey: `appointment-cancelled-${appointmentId}-v8`,
        type: 'appointment_cancelled',
      },
    });
  });

  it('não cria trabalho sem destinatários', async () => {
    await writer.recordCancelled({
      ...snapshot,
      revision: 8,
      recipientIds: [],
    });
    expect(create).not.toHaveBeenCalled();
  });
});
