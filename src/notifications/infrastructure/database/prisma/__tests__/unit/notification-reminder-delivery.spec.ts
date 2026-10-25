import { randomUUID } from 'node:crypto';
import { NotificationOutboxPrismaRepository } from '../../notification-outbox-prisma.repository';

describe('Revalidação transacional do lembrete antes de entregar', () => {
  const appointmentId = randomUUID();
  const clientId = randomUUID();
  const professionalId = randomUUID();
  const eventId = randomUUID();
  const startsAt = new Date('2030-01-02T12:00:00.000Z');
  const dueAt = new Date('2030-01-01T12:00:00.000Z');
  let now: Date;
  let event: any;
  let appointment: any;
  const lock = jest.fn();
  const findAppointment = jest.fn();
  const findEvent = jest.fn();
  const createMany = jest.fn();
  const markProcessed = jest.fn();
  const tx = {
    $queryRaw: lock,
    appointment: { findUnique: findAppointment },
    notificationOutbox: { findUnique: findEvent, update: markProcessed },
    notification: { createMany },
  };
  const transact = jest.fn(async (work) => work(tx));
  const sut: NotificationOutboxPrismaRepository = Reflect.construct(
    NotificationOutboxPrismaRepository,
    [{ $transaction: transact }, { now: () => now }],
  );

  beforeEach(() => {
    jest.resetAllMocks();
    now = new Date(dueAt);
    event = {
      id: eventId,
      appointmentId,
      appointmentVersion: 4,
      eventKey: `appointment-reminder-${appointmentId}-${clientId}-v4-${startsAt.getTime()}`,
      recipientIds: [clientId],
      type: 'appointment_reminder',
      serviceName: 'Corte',
      barberShopName: 'Barbearia Escola',
      startsAt,
      timezone: 'America/Sao_Paulo',
      previousStartsAt: null,
      previousServiceName: null,
      processedAt: null,
    };
    appointment = {
      id: appointmentId,
      clientId,
      status: 'scheduled',
      date: startsAt,
      version: 4,
      createdAt: new Date('2029-12-31T12:00:00.000Z'),
    };
    transact.mockImplementation(async (work) => work(tx));
    lock.mockResolvedValue([{ id: appointmentId }]);
    findEvent.mockImplementation(async () => event);
    findAppointment.mockImplementation(async () => appointment);
    createMany.mockResolvedValue({ count: 1 });
    markProcessed.mockResolvedValue({});
  });

  it('entrega no limite exato das 24 horas com lock antes de revalidar e gravar', async () => {
    await sut.deliver(eventId);
    expect(transact).toHaveBeenCalledTimes(1);
    expect(lock).toHaveBeenCalledTimes(1);
    const [sql, ...parameters] = lock.mock.calls[0];
    expect(Array.from(sql).join(' ')).toMatch(/Appointment.*FOR UPDATE/i);
    expect(parameters).toContain(appointmentId);
    expect(findAppointment).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: appointmentId } }),
    );
    expect(lock.mock.invocationCallOrder[0]).toBeLessThan(
      findAppointment.mock.invocationCallOrder[0],
    );
    expect(findAppointment.mock.invocationCallOrder[0]).toBeLessThan(
      createMany.mock.invocationCallOrder[0],
    );
    expect(createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          userId: clientId,
          appointmentId,
          eventKey: event.eventKey,
          type: 'appointment_reminder',
          startsAt,
        }),
      ],
      skipDuplicates: true,
    });
    expect(markProcessed).toHaveBeenCalledWith({
      where: { id: eventId },
      data: { processedAt: now },
    });
    expect(createMany.mock.invocationCallOrder[0]).toBeLessThan(
      markProcessed.mock.invocationCallOrder[0],
    );
  });

  it('recupera atraso até um milissegundo antes do início, inclusive reserva criada exatamente no limite', async () => {
    now = new Date(startsAt.getTime() - 1);
    appointment.createdAt = dueAt;
    await sut.deliver(eventId);
    expect(createMany).toHaveBeenCalledTimes(1);
    expect(markProcessed).toHaveBeenCalledWith({
      where: { id: eventId },
      data: { processedAt: now },
    });
  });

  it.each([
    ['cancelado', { status: 'cancelled' }],
    ['concluído', { status: 'completed' }],
    ['revisão alterada', { version: 5 }],
    ['horário alterado', { date: new Date('2030-01-02T13:00:00.000Z') }],
    ['cliente alterado', { clientId: professionalId }],
    [
      'reserva criada dentro das 24 horas',
      { createdAt: new Date(dueAt.getTime() + 1) },
    ],
  ])(
    'descarta lembrete %s e conclui o evento sem criar notificação',
    async (_description, changed) => {
      Object.assign(appointment, changed);
      await sut.deliver(eventId);
      expect(lock).toHaveBeenCalledTimes(1);
      expect(createMany).not.toHaveBeenCalled();
      expect(markProcessed).toHaveBeenCalledWith({
        where: { id: eventId },
        data: { processedAt: now },
      });
    },
  );

  it.each([
    ['sem destinatário', []],
    ['destinatário diferente do cliente', [professionalId]],
    ['inclui profissional', [clientId, professionalId]],
    ['cliente duplicado', [clientId, clientId]],
  ])(
    'descarta evento %s sem ampliar destinatários',
    async (_description, recipientIds) => {
      event.recipientIds = recipientIds;
      await sut.deliver(eventId);
      expect(createMany).not.toHaveBeenCalled();
      expect(markProcessed).toHaveBeenCalledTimes(1);
    },
  );

  it.each([
    ['um milissegundo antes das 24 horas', new Date(dueAt.getTime() - 1)],
    ['exatamente no início', startsAt],
    ['depois do início', new Date(startsAt.getTime() + 1)],
  ])('descarta lembrete fora da janela: %s', async (_description, instant) => {
    now = instant;
    await sut.deliver(eventId);
    expect(createMany).not.toHaveBeenCalled();
    expect(markProcessed).toHaveBeenCalledWith({
      where: { id: eventId },
      data: { processedAt: now },
    });
  });

  it('descarta quando a reserva foi removida ou a revisão do evento não existe', async () => {
    appointment = null;
    await sut.deliver(eventId);
    expect(createMany).not.toHaveBeenCalled();
    expect(markProcessed).toHaveBeenCalledTimes(1);
    appointment = {
      clientId,
      status: 'scheduled',
      date: startsAt,
      version: 4,
      createdAt: dueAt,
    };
    event.appointmentVersion = null;
    markProcessed.mockClear();
    await sut.deliver(eventId);
    expect(createMany).not.toHaveBeenCalled();
    expect(markProcessed).toHaveBeenCalledTimes(1);
  });

  it.each([
    'appointment_created',
    'appointment_updated',
    'appointment_cancelled',
  ])('preserva evento histórico %s sem revalidar a reserva', async (type) => {
    event.type = type;
    appointment.status = 'cancelled';
    appointment.version = 99;
    now = new Date(startsAt.getTime() + 1);
    await sut.deliver(eventId);
    expect(createMany).toHaveBeenCalledTimes(1);
    expect(lock).not.toHaveBeenCalled();
    expect(findAppointment).not.toHaveBeenCalled();
  });

  it.each(['ausente', 'já processado'])(
    'ignora evento %s antes de consultar a reserva',
    async (state) => {
      if (state === 'ausente') event = null;
      else event.processedAt = dueAt;
      await sut.deliver(eventId);
      expect(lock).not.toHaveBeenCalled();
      expect(findAppointment).not.toHaveBeenCalled();
      expect(createMany).not.toHaveBeenCalled();
      expect(markProcessed).not.toHaveBeenCalled();
    },
  );

  it('propaga falha de persistência para que notificação e marcador revertam juntos', async () => {
    createMany.mockRejectedValueOnce(new Error('Falha de persistência'));
    await expect(sut.deliver(eventId)).rejects.toThrow('Falha de persistência');
    expect(markProcessed).not.toHaveBeenCalled();
  });
});
