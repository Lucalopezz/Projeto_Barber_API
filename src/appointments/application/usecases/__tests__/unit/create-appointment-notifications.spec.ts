import { randomUUID } from 'node:crypto';
import { CreateAppointmentsUseCase } from '../../create-appointment.usecase';
import { ConflictError } from '@/shared/domain/errors/conflict-error';

describe('Confirmação de reserva na outbox transacional', () => {
  const clientId = randomUUID();
  const barberId = randomUUID();
  const ownerId = randomUUID();
  const shopId = randomUUID();
  const serviceId = randomUUID();
  const date = new Date('2030-01-07T12:00:00Z');
  const insert = jest.fn();
  const recordCreated = jest.fn();
  const ensureAvailable = jest.fn();
  const context = {
    appointments: { insert },
    availability: { ensureAvailable },
    notificationOutbox: { recordCreated },
  };
  const run = jest.fn((_barberId, work) => work(context));
  const sut = new CreateAppointmentsUseCase.UseCase(
    {} as any,
    {
      findById: async () => ({
        duration: 30,
        barberShopId: shopId,
        name: 'Corte',
      }),
    } as any,
    {
      findById: async () => ({
        id: shopId,
        ownerId,
        name: 'Barbearia Escola',
        timezone: 'America/Sao_Paulo',
      }),
    } as any,
    {} as any,
    { run },
    {
      findById: async () => ({
        id: barberId,
        role: 'barber',
        barberShopId: shopId,
      }),
    } as any,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    insert.mockResolvedValue(undefined);
    recordCreated.mockResolvedValue(undefined);
    ensureAvailable.mockResolvedValue(undefined);
  });

  it('grava a confirmação para cliente e profissional atribuído no contexto da reserva', async () => {
    const output = await sut.execute({ clientId, barberId, serviceId, date });
    expect(run).toHaveBeenCalledWith(barberId, expect.any(Function));
    expect(recordCreated).toHaveBeenCalledTimes(1);
    expect(recordCreated).toHaveBeenCalledWith({
      appointmentId: output.id,
      recipientIds: [clientId, barberId],
      serviceName: 'Corte',
      barberShopName: 'Barbearia Escola',
      startsAt: date,
      timezone: 'America/Sao_Paulo',
    });
    expect(recordCreated.mock.invocationCallOrder[0]).toBeGreaterThan(
      insert.mock.invocationCallOrder[0],
    );
  });

  it('não produz evento para uma reserva rejeitada', async () => {
    ensureAvailable.mockRejectedValueOnce(
      new ConflictError('Appointment not available'),
    );
    await expect(
      sut.execute({ clientId, barberId, serviceId, date }),
    ).rejects.toThrow(ConflictError);
    expect(insert).not.toHaveBeenCalled();
    expect(recordCreated).not.toHaveBeenCalled();
  });

  it('usa o dono como destinatário quando ele é o profissional da reserva', async () => {
    await sut.execute({ clientId, serviceId, date });
    expect(recordCreated).toHaveBeenCalledWith(
      expect.objectContaining({ recipientIds: [clientId, ownerId] }),
    );
  });

  it('gera um único destinatário quando a própria pessoa reserva seu serviço', async () => {
    await sut.execute({ clientId: ownerId, serviceId, date });
    expect(recordCreated).toHaveBeenCalledWith(
      expect.objectContaining({ recipientIds: [ownerId] }),
    );
  });

  it('propaga a falha da outbox para que a transação reverta também a reserva', async () => {
    recordCreated.mockRejectedValueOnce(new Error('outbox indisponível'));
    await expect(
      sut.execute({ clientId, barberId, serviceId, date }),
    ).rejects.toThrow('outbox indisponível');
  });
});
