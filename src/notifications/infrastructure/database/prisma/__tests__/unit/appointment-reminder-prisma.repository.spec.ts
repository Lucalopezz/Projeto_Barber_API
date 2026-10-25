import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { AppointmentReminderCandidate } from '@/notifications/application/ports/appointment-reminder.repository';
import { AppointmentReminderPrismaRepository } from '../../appointment-reminder-prisma.repository';

describe('Persistência da busca e gravação de lembretes', () => {
  const now = new Date('2030-01-07T12:00:00.000Z');
  const startsAt = new Date('2030-01-08T12:00:00.000Z');
  const createdAt = new Date('2030-01-06T12:00:00.000Z');
  const findMany = jest.fn();
  const createMany = jest.fn();
  const prisma = {
    appointment: { findMany },
    notificationOutbox: { createMany },
  } as unknown as PrismaService;
  const sut = new AppointmentReminderPrismaRepository(prisma);
  const candidate: AppointmentReminderCandidate = {
    appointmentId: 'appointment-1',
    clientId: 'client-1',
    version: 2,
    startsAt,
    createdAt,
    serviceName: 'Corte',
    barberShopName: 'Barbearia Escola',
    timezone: 'America/Sao_Paulo',
  };

  beforeEach(() => {
    jest.resetAllMocks();
    createMany.mockResolvedValue({ count: 1 });
    findMany.mockResolvedValue([]);
  });

  it('busca somente reservas agendadas futuras, dentro das 24h, em ordem estável', async () => {
    findMany.mockResolvedValue([
      {
        id: candidate.appointmentId,
        clientId: candidate.clientId,
        version: candidate.version,
        date: startsAt,
        createdAt,
        service: { name: 'Corte' },
        barberShop: { name: 'Barbearia Escola', timezone: 'America/Sao_Paulo' },
      },
    ]);
    await expect(sut.findCandidates(now, undefined, 100)).resolves.toEqual([
      candidate,
    ]);
    expect(findMany).toHaveBeenCalledWith({
      where: { status: 'scheduled', date: { gt: now, lte: startsAt } },
      orderBy: { id: 'asc' },
      take: 100,
      select: {
        id: true,
        clientId: true,
        version: true,
        date: true,
        createdAt: true,
        service: { select: { name: true } },
        barberShop: { select: { name: true, timezone: true } },
      },
    });
    expect(now.toISOString()).toBe('2030-01-07T12:00:00.000Z');
  });

  it('continua a busca após o último ID da página anterior', async () => {
    await sut.findCandidates(now, 'appointment-1', 50);
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          status: 'scheduled',
          date: { gt: now, lte: startsAt },
          id: { gt: 'appointment-1' },
        },
        orderBy: { id: 'asc' },
        take: 50,
      }),
    );
  });

  it('grava somente o cliente, revisão e snapshot com chave única e skipDuplicates', async () => {
    await sut.recordReminders([candidate]);
    expect(createMany).toHaveBeenCalledWith({
      skipDuplicates: true,
      data: [
        {
          appointmentId: candidate.appointmentId,
          eventKey: `appointment-reminder-appointment-1-client-1-v2-${startsAt.getTime()}`,
          type: 'appointment_reminder',
          recipientIds: ['client-1'],
          appointmentVersion: 2,
          startsAt,
          serviceName: 'Corte',
          barberShopName: 'Barbearia Escola',
          timezone: 'America/Sao_Paulo',
        },
      ],
    });
    expect(createMany.mock.calls[0][0].data[0]).not.toHaveProperty('createdAt');
  });

  it('não grava lote vazio', async () => {
    await sut.recordReminders([]);
    expect(createMany).not.toHaveBeenCalled();
  });
});
