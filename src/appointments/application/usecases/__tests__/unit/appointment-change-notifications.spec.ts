import { randomUUID } from 'node:crypto';
import { AppointmentEntity } from '@/appointments/domain/entities/appointment.entity';
import { AppointmentDataBuilder } from '@/appointments/domain/helpers/appointment-data-builder';
import { AppointmentStatus } from '@/appointments/domain/entities/appointmentStatus.enum';
import { AppointmentBookingPolicy } from '@/appointments/application/services/appointment-booking-policy';
import { ConflictError } from '@/shared/domain/errors/conflict-error';
import { UnauthorizedError } from '@/shared/application/errors/unauthorized-error';
import { UpdateAppointmentUseCase } from '../../update-appointment.usecase';
import { UpdateStatusUseCase } from '../../update-status.usecase';

describe('Eventos transacionais de remarcação e cancelamento', () => {
  const clientId = randomUUID();
  const barberId = randomUUID();
  const ownerId = randomUUID();
  const shopId = randomUUID();
  const serviceId = randomUUID();
  const otherServiceId = randomUUID();
  const originalDate = new Date('2030-01-07T12:00:00.000Z');
  const nextDate = new Date('2030-01-07T14:00:00.000Z');
  const policy = new AppointmentBookingPolicy({
    now: () => new Date('2030-01-01T12:00:00.000Z'),
  });
  let appointment: AppointmentEntity;
  let actorId: string;
  const update = jest.fn();
  const directUpdate = jest.fn();
  const ensureAvailable = jest.fn();
  const recordUpdated = jest.fn();
  const recordCancelled = jest.fn();
  const context = {
    appointments: { update },
    availability: { ensureAvailable },
    notificationOutbox: {
      recordCreated: jest.fn(),
      recordUpdated,
      recordCancelled,
    },
  };
  const run = jest.fn((_barberId, work) => work(context));
  const appointments = {
    findById: jest.fn(async () => appointment),
    update: directUpdate,
  };
  const services = {
    findById: jest.fn(async (id: string) => ({
      id,
      name: id === otherServiceId ? 'Barba' : 'Corte',
      duration: 30,
      barberShopId: shopId,
    })),
  };
  const shops = {
    findById: jest.fn(async () => ({
      id: shopId,
      name: 'Barbearia Escola',
      ownerId,
      timezone: 'America/Sao_Paulo',
    })),
  };
  const users = {
    findById: jest.fn(async () => ({
      id: actorId,
      barberShopId: actorId === clientId ? null : shopId,
    })),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    actorId = barberId;
    appointment = new AppointmentEntity({
      ...AppointmentDataBuilder({
        clientId,
        barberId,
        barberShopId: shopId,
        serviceId,
        date: originalDate,
      }),
      version: 7,
    });
    update.mockResolvedValue(undefined);
    directUpdate.mockResolvedValue(undefined);
    ensureAvailable.mockResolvedValue(undefined);
    recordUpdated.mockResolvedValue(undefined);
    recordCancelled.mockResolvedValue(undefined);
  });

  const reschedule = () =>
    new UpdateAppointmentUseCase.UseCase(
      appointments as any,
      services as any,
      users as any,
      shops as any,
      { ensureAvailable } as any,
      { run },
    );

  // The extra arguments are ignored by the old constructor, allowing a behavioral
  // RED before the transactional cancellation adapter exists.
  const changeStatus = (): UpdateStatusUseCase.UseCase =>
    Reflect.construct(UpdateStatusUseCase.UseCase, [
      appointments,
      shops,
      users,
      policy,
      { run },
      services,
    ]);

  it('grava novo horário e serviço, snapshot anterior e revisão no contexto da alteração', async () => {
    await reschedule().execute({
      id: appointment.id,
      userId: actorId,
      date: nextDate,
      serviceId: otherServiceId,
    });
    expect(recordUpdated).toHaveBeenCalledTimes(1);
    expect(recordUpdated).toHaveBeenCalledWith({
      appointmentId: appointment.id,
      recipientIds: [clientId, barberId],
      revision: 8,
      serviceName: 'Barba',
      barberShopName: 'Barbearia Escola',
      startsAt: nextDate,
      timezone: 'America/Sao_Paulo',
      previousStartsAt: originalDate,
      previousServiceName: 'Corte',
    });
    expect(update).toHaveBeenCalledTimes(1);
    expect(directUpdate).not.toHaveBeenCalled();
    expect(recordUpdated.mock.invocationCallOrder[0]).toBeGreaterThan(
      update.mock.invocationCallOrder[0],
    );
  });

  it('uma troca de serviço sem remarcação também gera evento para as duas partes', async () => {
    await reschedule().execute({
      id: appointment.id,
      userId: actorId,
      serviceId: otherServiceId,
    });
    expect(recordUpdated).toHaveBeenCalledWith(
      expect.objectContaining({
        startsAt: originalDate,
        previousStartsAt: originalDate,
        serviceName: 'Barba',
        previousServiceName: 'Corte',
        revision: 8,
        recipientIds: [clientId, barberId],
      }),
    );
  });

  it('não emite evento quando data e serviço continuam iguais, preservando o update atual', async () => {
    await reschedule().execute({
      id: appointment.id,
      userId: actorId,
      date: new Date(originalDate),
      serviceId,
    });
    expect(update).toHaveBeenCalledTimes(1);
    expect(recordUpdated).not.toHaveBeenCalled();
  });

  it('uma remarcação rejeitada não grava evento nem altera a reserva', async () => {
    ensureAvailable.mockRejectedValueOnce(
      new ConflictError('Intervalo ocupado'),
    );
    await expect(
      reschedule().execute({
        id: appointment.id,
        userId: actorId,
        date: nextDate,
      }),
    ).rejects.toThrow('Intervalo ocupado');
    expect(update).not.toHaveBeenCalled();
    expect(recordUpdated).not.toHaveBeenCalled();
  });

  it('um conflito otimista na remarcação não grava evento', async () => {
    update.mockRejectedValueOnce(new ConflictError('Revisão antiga'));
    await expect(
      reschedule().execute({
        id: appointment.id,
        userId: actorId,
        date: nextDate,
      }),
    ).rejects.toThrow('Revisão antiga');
    expect(recordUpdated).not.toHaveBeenCalled();
  });

  it('propaga falha de evento na remarcação para reverter a transação', async () => {
    recordUpdated.mockRejectedValueOnce(new Error('Falha na outbox'));
    await expect(
      reschedule().execute({
        id: appointment.id,
        userId: actorId,
        date: nextDate,
      }),
    ).rejects.toThrow('Falha na outbox');
  });

  it.each([
    ['cliente', clientId, barberId],
    ['profissional', barberId, clientId],
  ])(
    'cancelamento pelo %s notifica somente a outra parte',
    async (_name, actor, recipient) => {
      actorId = actor;
      await changeStatus().execute({
        id: appointment.id,
        userId: actorId,
        newStatus: AppointmentStatus.cancelled,
      });
      expect(run).toHaveBeenCalledWith(barberId, expect.any(Function));
      expect(update).toHaveBeenCalledTimes(1);
      expect(directUpdate).not.toHaveBeenCalled();
      expect(recordCancelled).toHaveBeenCalledWith({
        appointmentId: appointment.id,
        recipientIds: [recipient],
        revision: 8,
        serviceName: 'Corte',
        barberShopName: 'Barbearia Escola',
        startsAt: originalDate,
        timezone: 'America/Sao_Paulo',
      });
    },
  );

  it('não emite cancelamento quando cliente e profissional são a mesma pessoa', async () => {
    appointment = new AppointmentEntity({
      ...appointment.props,
      clientId: barberId,
    });
    await changeStatus().execute({
      id: appointment.id,
      userId: barberId,
      newStatus: AppointmentStatus.cancelled,
    });
    expect(update).toHaveBeenCalledTimes(1);
    expect(recordCancelled).not.toHaveBeenCalled();
  });

  it('concluir o atendimento não produz evento de cancelamento ou remarcação', async () => {
    await changeStatus().execute({
      id: appointment.id,
      userId: barberId,
      newStatus: AppointmentStatus.completed,
    });
    expect(recordCancelled).not.toHaveBeenCalled();
    expect(recordUpdated).not.toHaveBeenCalled();
  });

  it('um conflito otimista no cancelamento não grava evento', async () => {
    update.mockRejectedValueOnce(new ConflictError('Revisão antiga'));
    await expect(
      changeStatus().execute({
        id: appointment.id,
        userId: barberId,
        newStatus: AppointmentStatus.cancelled,
      }),
    ).rejects.toThrow('Revisão antiga');
    expect(recordCancelled).not.toHaveBeenCalled();
  });

  it('propaga falha da outbox no cancelamento para reverter a alteração de status', async () => {
    recordCancelled.mockRejectedValueOnce(new Error('Falha na outbox'));
    await expect(
      changeStatus().execute({
        id: appointment.id,
        userId: barberId,
        newStatus: AppointmentStatus.cancelled,
      }),
    ).rejects.toThrow('Falha na outbox');
  });

  it.each(['remarcação', 'cancelamento'])(
    'o dono sem atribuição não produz evento de %s',
    async (operation) => {
      actorId = ownerId;
      const result =
        operation === 'remarcação'
          ? reschedule().execute({
              id: appointment.id,
              userId: actorId,
              date: nextDate,
            })
          : changeStatus().execute({
              id: appointment.id,
              userId: actorId,
              newStatus: AppointmentStatus.cancelled,
            });
      await expect(result).rejects.toThrow(UnauthorizedError);
      expect(run).not.toHaveBeenCalled();
      expect(recordUpdated).not.toHaveBeenCalled();
      expect(recordCancelled).not.toHaveBeenCalled();
    },
  );
});
