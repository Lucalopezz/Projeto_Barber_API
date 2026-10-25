import { randomUUID } from 'node:crypto';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import {
  clearDatabase,
  setupPrismaTests,
} from '@/shared/infrastructure/database/testing/setup-prisma-tests';
import { SearchParams } from '@/shared/domain/repositories/searchable.repository';
import { UserEntity } from '@/users/domain/entities/user.entity';
import { UserDataBuilder } from '@/users/domain/helpers/user-data-builder';
import { Role } from '@/users/domain/entities/role.enum';
import { UserPrismaRepository } from '@/users/infrastructure/database/prisma/repositories/user-prisma.repository';
import { BarberShopEntity } from '@/barberShop/domain/entities/barber-shop.entity';
import { BarberShopDataBuilder } from '@/barberShop/domain/helpers/barberShop-data-builder';
import { BarberShopPrismaRepository } from '@/barberShop/infrastructure/database/prisma/repositories/barberShop-prisma.repository';
import { ServiceEntity } from '@/services/domain/entities/services.entity';
import { ServiceDataBuilder } from '@/services/domain/helpers/service-data-builder';
import { ServicesPrismaRepository } from '@/services/infrastructure/database/prisma/services-prisma.repository';
import { AppointmentEntity } from '@/appointments/domain/entities/appointment.entity';
import { AppointmentDataBuilder } from '@/appointments/domain/helpers/appointment-data-builder';
import { AppointmentBookingPolicy } from '@/appointments/application/services/appointment-booking-policy';
import { AppointmentAvailabilityService } from '@/appointments/application/services/appointment-availability.service';
import { CreateAppointmentsUseCase } from '@/appointments/application/usecases/create-appointment.usecase';
import { UpdateAppointmentUseCase } from '@/appointments/application/usecases/update-appointment.usecase';
import { UpdateStatusUseCase } from '@/appointments/application/usecases/update-status.usecase';
import { AppointmentStatus } from '@/appointments/domain/entities/appointmentStatus.enum';
import { AppointmentsPrismaRepository } from '@/appointments/infrastructure/database/prisma/repositories/appointments-prisma.repository';
import { BarberAvailabilityPrismaRepository } from '@/appointments/infrastructure/database/prisma/repositories/barber-availability-prisma.repository';
import { ProfessionalBookingPrismaTransaction } from '@/appointments/infrastructure/database/prisma/professional-booking-prisma.transaction';
import {
  NotificationOutboxPrismaRepository,
  NotificationOutboxPrismaWriter,
} from '../../notification-outbox-prisma.repository';
import { NotificationPrismaRepository } from '../../notification-prisma.repository';
import { AppointmentReminderPrismaRepository } from '../../appointment-reminder-prisma.repository';
import { ScheduleAppointmentRemindersUseCase } from '@/notifications/application/usecases/schedule-appointment-reminders.usecase';

describe('Confirmações transacionais e idempotência (PostgreSQL real)', () => {
  const prisma = new PrismaService();
  let ready = false;
  let ownerId: string;
  let barberId: string;
  let clientId: string;
  let shopId: string;
  let serviceId: string;
  let create: CreateAppointmentsUseCase.UseCase;
  let reschedule: UpdateAppointmentUseCase.UseCase;
  let changeStatus: UpdateStatusUseCase.UseCase;
  let transaction: ProfessionalBookingPrismaTransaction;
  let outbox: NotificationOutboxPrismaRepository;
  const startsAt = new Date('2030-01-07T12:00:00.000Z');

  beforeAll(async () => {
    setupPrismaTests();
    await prisma.$connect();
    ready = true;
  });

  beforeEach(async () => {
    await clearDatabase(prisma);
    const users = new UserPrismaRepository(prisma);
    const shops = new BarberShopPrismaRepository(prisma);
    const services = new ServicesPrismaRepository(prisma);
    const owner = new UserEntity(UserDataBuilder({ role: Role.owner }));
    await users.insert(owner);
    const shop = new BarberShopEntity(
      BarberShopDataBuilder({ ownerId: owner.id, name: 'Barbearia Escola' }),
    );
    await shops.insert(shop);
    const barber = new UserEntity(
      UserDataBuilder({ role: Role.barber, barberShopId: shop.id }),
    );
    const client = new UserEntity(UserDataBuilder({ role: Role.client }));
    await users.insert(barber);
    await users.insert(client);
    const service = new ServiceEntity(
      ServiceDataBuilder({
        barberShopId: shop.id,
        name: 'Corte',
        duration: 30,
      }),
    );
    await services.insert(service);
    ownerId = owner.id;
    barberId = barber.id;
    clientId = client.id;
    shopId = shop.id;
    serviceId = service.id;
    await prisma.barberSchedule.createMany({
      data: [ownerId, barberId].map((id) => ({
        id: randomUUID(),
        barberId: id,
        dayOfWeek: 1,
        startMinute: 0,
        endMinute: 1440,
      })),
    });
    const policy = new AppointmentBookingPolicy({
      now: () => new Date('2030-01-01T12:00:00.000Z'),
    });
    const appointments = new AppointmentsPrismaRepository(prisma);
    transaction = new ProfessionalBookingPrismaTransaction(prisma, policy);
    create = new CreateAppointmentsUseCase.UseCase(
      appointments,
      services,
      shops,
      new AppointmentAvailabilityService(
        appointments,
        new BarberAvailabilityPrismaRepository(prisma),
        policy,
      ),
      transaction,
      users,
    );
    outbox = new NotificationOutboxPrismaRepository(prisma);
    reschedule = new UpdateAppointmentUseCase.UseCase(
      appointments,
      services,
      users,
      shops,
      new AppointmentAvailabilityService(
        appointments,
        new BarberAvailabilityPrismaRepository(prisma),
        policy,
      ),
      transaction,
    );
    changeStatus = Reflect.construct(UpdateStatusUseCase.UseCase, [
      appointments,
      shops,
      users,
      policy,
      transaction,
      services,
    ]);
  });

  afterEach(() => jest.restoreAllMocks());

  afterAll(async () => {
    if (ready) await clearDatabase(prisma);
    await prisma.$disconnect();
  });

  const book = (date = startsAt, assignedBarberId?: string) =>
    create.execute({
      clientId,
      serviceId,
      barberId: assignedBarberId ?? barberId,
      date,
    });

  it('persiste reserva e evento juntos, sem conexão com Redis ou publicação na requisição', async () => {
    const appointment = await book();
    const event = await prisma.notificationOutbox.findFirstOrThrow();
    expect(event).toEqual(
      expect.objectContaining({
        appointmentId: appointment.id,
        eventKey: `appointment-created-${appointment.id}`,
        recipientIds: [clientId, barberId],
        processedAt: null,
        serviceName: 'Corte',
        barberShopName: 'Barbearia Escola',
        startsAt,
        timezone: 'America/Sao_Paulo',
      }),
    );
    expect(event.recipientIds).not.toContain(ownerId);
    expect(await prisma.appointment.count()).toBe(1);
    expect(await prisma.notification.count()).toBe(0);
  });

  it('notifica o dono somente quando ele é o profissional atribuído', async () => {
    await book(startsAt, ownerId);
    const event = await prisma.notificationOutbox.findFirstOrThrow();
    await outbox.deliver(event.id);
    const notifications = await prisma.notification.findMany();
    expect(notifications.map((item) => item.userId).sort()).toEqual(
      [clientId, ownerId].sort(),
    );
  });

  it('uma reserva rejeitada por conflito não produz um segundo evento', async () => {
    await book();
    await expect(book()).rejects.toThrow('Appointment not available');
    expect(await prisma.appointment.count()).toBe(1);
    expect(await prisma.notificationOutbox.count()).toBe(1);
  });

  it('reverte reserva e outbox se o trabalho falhar após ambas as gravações', async () => {
    const entity = new AppointmentEntity(
      AppointmentDataBuilder({
        clientId,
        barberId,
        barberShopId: shopId,
        serviceId,
        date: startsAt,
      }),
    );
    await expect(
      transaction.run(barberId, async (context) => {
        await context.appointments.insert(entity);
        await context.notificationOutbox.recordCreated({
          appointmentId: entity.id,
          recipientIds: [clientId, barberId],
          serviceName: 'Corte',
          barberShopName: 'Barbearia Escola',
          startsAt,
          timezone: 'America/Sao_Paulo',
        });
        throw new Error('Falha antes do commit');
      }),
    ).rejects.toThrow('Falha antes do commit');
    expect(await prisma.appointment.count()).toBe(0);
    expect(await prisma.notificationOutbox.count()).toBe(0);
    expect(await prisma.notification.count()).toBe(0);
  });

  it('dois workers concorrentes e um retry produzem uma confirmação por destinatário', async () => {
    await book();
    const event = await prisma.notificationOutbox.findFirstOrThrow();
    await Promise.all([outbox.deliver(event.id), outbox.deliver(event.id)]);
    await new NotificationOutboxPrismaRepository(prisma).deliver(event.id);
    const notifications = await prisma.notification.findMany();
    expect(notifications).toHaveLength(2);
    expect(notifications.map((item) => item.userId).sort()).toEqual(
      [clientId, barberId].sort(),
    );
    expect(
      (
        await prisma.notificationOutbox.findUniqueOrThrow({
          where: { id: event.id },
        })
      ).processedAt,
    ).toBeInstanceOf(Date);
    expect(await outbox.findPending(undefined, 100)).toEqual([]);
  });

  it('a marca de entrega e as duas notificações revertem juntas em falha de destinatário', async () => {
    await book();
    const event = await prisma.notificationOutbox.findFirstOrThrow();
    await prisma.notificationOutbox.update({
      where: { id: event.id },
      data: { recipientIds: [clientId, randomUUID()] },
    });
    await expect(outbox.deliver(event.id)).rejects.toThrow();
    expect(await prisma.notification.count()).toBe(0);
    expect(
      (
        await prisma.notificationOutbox.findUniqueOrThrow({
          where: { id: event.id },
        })
      ).processedAt,
    ).toBeNull();
  });

  it('preserva o snapshot da confirmação mesmo após mudanças no cadastro e na reserva', async () => {
    const appointment = await book();
    const event = await prisma.notificationOutbox.findFirstOrThrow();
    await prisma.service.update({
      where: { id: serviceId },
      data: { name: 'Novo corte' },
    });
    await prisma.barberShop.update({
      where: { id: shopId },
      data: { name: 'Novo nome' },
    });
    await prisma.appointment.update({
      where: { id: appointment.id },
      data: {
        date: new Date('2030-01-07T14:00:00.000Z'),
        endDate: new Date('2030-01-07T14:30:00.000Z'),
      },
    });
    await outbox.deliver(event.id);
    expect(await prisma.notification.findMany()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          serviceName: 'Corte',
          barberShopName: 'Barbearia Escola',
          startsAt,
        }),
      ]),
    );
  });

  it('lista e conta somente as notificações do usuário, com paginação estável', async () => {
    await book();
    await book(new Date('2030-01-07T13:00:00.000Z'));
    for (const eventId of await outbox.findPending(undefined, 100))
      await outbox.deliver(eventId);
    const repository = new NotificationPrismaRepository(prisma);
    const first = await repository.listByUser(
      clientId,
      new SearchParams({ page: 1, perPage: 1 }),
    );
    const second = await repository.listByUser(
      clientId,
      new SearchParams({ page: 2, perPage: 1 }),
    );
    expect(first.total).toBe(2);
    expect(first.lastPage).toBe(2);
    expect(second.total).toBe(2);
    expect(first.items).toHaveLength(1);
    expect(second.items).toHaveLength(1);
    expect(first.items[0].id).not.toBe(second.items[0].id);
    expect(first.items[0].toJSON().userId).toBe(clientId);
    expect(second.items[0].toJSON().userId).toBe(clientId);
    const owner = await repository.listByUser(ownerId, new SearchParams());
    expect(owner.total).toBe(0);
    expect(owner.items).toEqual([]);
  });

  it('remarcação e troca de serviço gravam evento da revisão com snapshots anterior e novo', async () => {
    const appointment = await book();
    const nextService = new ServiceEntity(
      ServiceDataBuilder({
        barberShopId: shopId,
        name: 'Barba',
        duration: 30,
      }),
    );
    await prisma.service.create({ data: nextService.toJSON() });
    const nextDate = new Date('2030-01-07T14:00:00.000Z');
    await reschedule.execute({
      id: appointment.id,
      userId: barberId,
      date: nextDate,
      serviceId: nextService.id,
    });
    const event = await prisma.notificationOutbox.findUniqueOrThrow({
      where: { eventKey: `appointment-updated-${appointment.id}-v1` },
    });
    expect(event).toEqual(
      expect.objectContaining({
        type: 'appointment_updated',
        recipientIds: [clientId, barberId],
        serviceName: 'Barba',
        previousServiceName: 'Corte',
        startsAt: nextDate,
        previousStartsAt: startsAt,
        timezone: 'America/Sao_Paulo',
        processedAt: null,
      }),
    );
    expect(
      (
        await prisma.appointment.findUniqueOrThrow({
          where: { id: appointment.id },
        })
      ).version,
    ).toBe(1);
    await Promise.all([outbox.deliver(event.id), outbox.deliver(event.id)]);
    expect(
      await prisma.notification.count({ where: { eventKey: event.eventKey } }),
    ).toBe(2);
    expect(
      await prisma.notification.findFirst({ where: { userId: ownerId } }),
    ).toBeNull();
  });

  it('cada remarcação confirmada usa sua própria revisão e mantém a confirmação original', async () => {
    const appointment = await book();
    for (const date of [
      '2030-01-07T13:00:00.000Z',
      '2030-01-07T14:00:00.000Z',
    ]) {
      await reschedule.execute({
        id: appointment.id,
        userId: barberId,
        date: new Date(date),
      });
    }
    const events = await prisma.notificationOutbox.findMany({
      where: { appointmentId: appointment.id },
    });
    expect(events.map((event) => event.eventKey).sort()).toEqual(
      [
        `appointment-created-${appointment.id}`,
        `appointment-updated-${appointment.id}-v1`,
        `appointment-updated-${appointment.id}-v2`,
      ].sort(),
    );
    for (const event of events) await outbox.deliver(event.id);
    expect(
      await prisma.notification.count({
        where: { appointmentId: appointment.id },
      }),
    ).toBe(6);
    expect(
      await prisma.notification.findFirst({
        where: { eventKey: `appointment-created-${appointment.id}` },
      }),
    ).toEqual(expect.objectContaining({ startsAt, serviceName: 'Corte' }));
  });

  it.each(['cliente', 'profissional'])(
    'cancelamento pelo %s entrega somente para a outra parte',
    async (actor) => {
      const appointment = await book();
      const actorId = actor === 'cliente' ? clientId : barberId;
      const recipientId = actor === 'cliente' ? barberId : clientId;
      await changeStatus.execute({
        id: appointment.id,
        userId: actorId,
        newStatus: AppointmentStatus.cancelled,
      });
      const event = await prisma.notificationOutbox.findUniqueOrThrow({
        where: { eventKey: `appointment-cancelled-${appointment.id}-v1` },
      });
      expect(event.recipientIds).toEqual([recipientId]);
      expect(event.type).toBe('appointment_cancelled');
      expect(
        (
          await prisma.appointment.findUniqueOrThrow({
            where: { id: appointment.id },
          })
        ).status,
      ).toBe('cancelled');
      await Promise.all([outbox.deliver(event.id), outbox.deliver(event.id)]);
      const notifications = await prisma.notification.findMany({
        where: { eventKey: event.eventKey },
      });
      expect(notifications).toHaveLength(1);
      expect(notifications[0].userId).toBe(recipientId);
    },
  );

  it('um update sem mudança não cria evento e a próxima mudança usa a revisão correta', async () => {
    const appointment = await book();
    await reschedule.execute({
      id: appointment.id,
      userId: barberId,
      date: startsAt,
      serviceId,
    });
    expect(await prisma.notificationOutbox.count()).toBe(1);
    await reschedule.execute({
      id: appointment.id,
      userId: barberId,
      date: new Date('2030-01-07T14:00:00.000Z'),
    });
    expect(
      await prisma.notificationOutbox.findUnique({
        where: { eventKey: `appointment-updated-${appointment.id}-v2` },
      }),
    ).not.toBeNull();
  });

  it('a conclusão não acrescenta evento de cancelamento ou remarcação', async () => {
    const appointment = await book();
    await changeStatus.execute({
      id: appointment.id,
      userId: barberId,
      newStatus: AppointmentStatus.completed,
    });
    expect(await prisma.notificationOutbox.count()).toBe(1);
    expect(
      (
        await prisma.appointment.findUniqueOrThrow({
          where: { id: appointment.id },
        })
      ).status,
    ).toBe('completed');
  });

  it.each(['remarcação', 'cancelamento'])(
    'falha da outbox na %s reverte a reserva e sua revisão',
    async (operation) => {
      const appointment = await book();
      const method =
        operation === 'remarcação' ? 'recordUpdated' : 'recordCancelled';
      jest
        .spyOn(NotificationOutboxPrismaWriter.prototype as any, method)
        .mockRejectedValueOnce(new Error('Falha de persistência na outbox'));
      const result =
        operation === 'remarcação'
          ? reschedule.execute({
              id: appointment.id,
              userId: barberId,
              date: new Date('2030-01-07T14:00:00.000Z'),
            })
          : changeStatus.execute({
              id: appointment.id,
              userId: barberId,
              newStatus: AppointmentStatus.cancelled,
            });
      await expect(result).rejects.toThrow('Falha de persistência na outbox');
      const saved = await prisma.appointment.findUniqueOrThrow({
        where: { id: appointment.id },
      });
      expect(saved.date).toEqual(startsAt);
      expect(saved.status).toBe('scheduled');
      expect(saved.version).toBe(0);
      expect(await prisma.notificationOutbox.count()).toBe(1);
    },
  );
  it('conta somente não lidas do destinatário e preserva a primeira leitura nos retries', async () => {
    await book();
    await book(new Date('2030-01-07T13:00:00.000Z'));
    for (const eventId of await outbox.findPending(undefined, 100))
      await outbox.deliver(eventId);
    const repository = new NotificationPrismaRepository(prisma);
    const notification = await prisma.notification.findFirstOrThrow({
      where: { userId: clientId },
    });
    expect(await repository.countUnread(clientId)).toBe(2);
    expect(await repository.countUnread(barberId)).toBe(2);
    expect(await repository.countUnread(ownerId)).toBe(0);
    const firstReadAt = new Date('2030-01-01T13:00:00.000Z');
    const first = await repository.markAsRead(
      clientId,
      notification.id,
      firstReadAt,
    );
    const retry = await repository.markAsRead(
      clientId,
      notification.id,
      new Date('2030-01-02T13:00:00.000Z'),
    );
    expect(first.toJSON().readAt).toEqual(firstReadAt);
    expect(retry.toJSON().readAt).toEqual(firstReadAt);
    expect(await repository.countUnread(clientId)).toBe(1);
    expect(await repository.countUnread(barberId)).toBe(2);
  });

  it('não lê nem modifica notificação alheia e trata ID inexistente da mesma forma', async () => {
    await book();
    const event = await prisma.notificationOutbox.findFirstOrThrow();
    await outbox.deliver(event.id);
    const repository = new NotificationPrismaRepository(prisma);
    const notification = await prisma.notification.findFirstOrThrow({
      where: { userId: clientId },
    });
    expect(
      await repository.markAsRead(barberId, notification.id, new Date()),
    ).toBeNull();
    expect(
      await repository.markAsRead(clientId, randomUUID(), new Date()),
    ).toBeNull();
    expect(
      (
        await prisma.notification.findUniqueOrThrow({
          where: { id: notification.id },
        })
      ).readAt,
    ).toBeNull();
    expect(await repository.countUnread(clientId)).toBe(1);
  });

  it('duas leituras concorrentes retornam a mesma primeira data sem sobrescrita', async () => {
    await book();
    const event = await prisma.notificationOutbox.findFirstOrThrow();
    await outbox.deliver(event.id);
    const repository = new NotificationPrismaRepository(prisma);
    const notification = await prisma.notification.findFirstOrThrow({
      where: { userId: clientId },
    });
    const firstDate = new Date('2030-01-01T13:00:00.000Z');
    const otherDate = new Date('2030-01-02T13:00:00.000Z');
    const [first, second] = await Promise.all([
      repository.markAsRead(clientId, notification.id, firstDate),
      repository.markAsRead(clientId, notification.id, otherDate),
    ]);
    const saved = await prisma.notification.findUniqueOrThrow({
      where: { id: notification.id },
    });
    expect([firstDate.getTime(), otherDate.getTime()]).toContain(
      saved.readAt.getTime(),
    );
    expect(first.toJSON().readAt).toEqual(saved.readAt);
    expect(second.toJSON().readAt).toEqual(saved.readAt);
    expect(await repository.countUnread(clientId)).toBe(0);
  });

  it('dois crons concorrentes e retries geram e entregam somente um lembrete ao cliente por versão', async () => {
    const appointment = await book();
    await prisma.appointment.update({
      where: { id: appointment.id },
      data: { createdAt: new Date('2030-01-01T12:00:00.000Z') },
    });
    const clock = { now: () => new Date('2030-01-06T12:00:00.000Z') };
    const schedule = new ScheduleAppointmentRemindersUseCase.UseCase(
      new AppointmentReminderPrismaRepository(prisma),
      clock,
    );
    await Promise.all([schedule.execute(), schedule.execute()]);
    await schedule.execute();
    const eventKey = `appointment-reminder-${appointment.id}-${clientId}-v0-${startsAt.getTime()}`;
    const events = await prisma.notificationOutbox.findMany({
      where: { eventKey },
    });
    expect(events).toHaveLength(1);
    expect(events[0]).toEqual(
      expect.objectContaining({
        type: 'appointment_reminder',
        recipientIds: [clientId],
        appointmentVersion: 0,
        startsAt,
      }),
    );
    const delivery = new NotificationOutboxPrismaRepository(prisma, clock);
    await Promise.all([
      delivery.deliver(events[0].id),
      delivery.deliver(events[0].id),
    ]);
    const notifications = await prisma.notification.findMany({
      where: { eventKey },
    });
    expect(notifications).toHaveLength(1);
    expect(notifications[0].userId).toBe(clientId);
    expect(notifications[0].createdAt).toEqual(clock.now());
    await schedule.execute();
    expect(await prisma.notificationOutbox.count({ where: { eventKey } })).toBe(
      1,
    );
  });

  it('descarta lembrete pendente após remarcação e gera somente o da nova versão quando vencer', async () => {
    const appointment = await book();
    await prisma.appointment.update({
      where: { id: appointment.id },
      data: { createdAt: new Date('2030-01-01T12:00:00.000Z') },
    });
    let now = new Date('2030-01-06T12:00:00.000Z');
    const clock = { now: () => now };
    const schedule = new ScheduleAppointmentRemindersUseCase.UseCase(
      new AppointmentReminderPrismaRepository(prisma),
      clock,
    );
    await schedule.execute();
    const old = await prisma.notificationOutbox.findFirstOrThrow({
      where: { type: 'appointment_reminder' },
    });
    const newDate = new Date('2030-01-07T14:00:00.000Z');
    await reschedule.execute({
      id: appointment.id,
      userId: barberId,
      date: newDate,
    });
    const delivery = new NotificationOutboxPrismaRepository(prisma, clock);
    await delivery.deliver(old.id);
    expect(
      (
        await prisma.notificationOutbox.findUniqueOrThrow({
          where: { id: old.id },
        })
      ).processedAt,
    ).toEqual(now);
    expect(
      await prisma.notification.count({
        where: { type: 'appointment_reminder' },
      }),
    ).toBe(0);
    now = new Date('2030-01-06T14:00:00.000Z');
    await schedule.execute();
    const current = await prisma.notificationOutbox.findUniqueOrThrow({
      where: {
        eventKey: `appointment-reminder-${appointment.id}-${clientId}-v1-${newDate.getTime()}`,
      },
    });
    await delivery.deliver(current.id);
    expect(
      await prisma.notification.findMany({
        where: { type: 'appointment_reminder' },
      }),
    ).toEqual([
      expect.objectContaining({ userId: clientId, startsAt: newDate }),
    ]);
  });

  it('lembrete pendente não é entregue depois de cancelamento confirmado', async () => {
    const appointment = await book();
    await prisma.appointment.update({
      where: { id: appointment.id },
      data: { createdAt: new Date('2030-01-01T12:00:00.000Z') },
    });
    const clock = { now: () => new Date('2030-01-06T12:00:00.000Z') };
    const schedule = new ScheduleAppointmentRemindersUseCase.UseCase(
      new AppointmentReminderPrismaRepository(prisma),
      clock,
    );
    await schedule.execute();
    const event = await prisma.notificationOutbox.findFirstOrThrow({
      where: { type: 'appointment_reminder' },
    });
    await changeStatus.execute({
      id: appointment.id,
      userId: clientId,
      newStatus: AppointmentStatus.cancelled,
    });
    await new NotificationOutboxPrismaRepository(prisma, clock).deliver(
      event.id,
    );
    expect(
      await prisma.notification.count({
        where: { type: 'appointment_reminder' },
      }),
    ).toBe(0);
    expect(
      (
        await prisma.notificationOutbox.findUniqueOrThrow({
          where: { id: event.id },
        })
      ).processedAt,
    ).toEqual(clock.now());
  });

  it('não agenda lembrete para reserva criada um milissegundo dentro da janela de 24 horas', async () => {
    const appointment = await book();
    const dueAt = new Date(startsAt.getTime() - 24 * 60 * 60_000);
    await prisma.appointment.update({
      where: { id: appointment.id },
      data: { createdAt: new Date(dueAt.getTime() + 1) },
    });
    await new ScheduleAppointmentRemindersUseCase.UseCase(
      new AppointmentReminderPrismaRepository(prisma),
      { now: () => dueAt },
    ).execute();
    expect(
      await prisma.notificationOutbox.count({
        where: { type: 'appointment_reminder' },
      }),
    ).toBe(0);
  });

  it('recupera scan atrasado até antes do início e descarta entrega que ultrapassou o início', async () => {
    const appointment = await book();
    await prisma.appointment.update({
      where: { id: appointment.id },
      data: { createdAt: new Date('2030-01-01T12:00:00.000Z') },
    });
    let now = new Date(startsAt.getTime() - 1);
    const clock = { now: () => now };
    const schedule = new ScheduleAppointmentRemindersUseCase.UseCase(
      new AppointmentReminderPrismaRepository(prisma),
      clock,
    );
    await schedule.execute();
    const event = await prisma.notificationOutbox.findFirstOrThrow({
      where: { type: 'appointment_reminder' },
    });
    now = new Date(startsAt);
    await new NotificationOutboxPrismaRepository(prisma, clock).deliver(
      event.id,
    );
    expect(
      await prisma.notification.count({
        where: { type: 'appointment_reminder' },
      }),
    ).toBe(0);
    expect(
      (
        await prisma.notificationOutbox.findUniqueOrThrow({
          where: { id: event.id },
        })
      ).processedAt,
    ).toEqual(startsAt);
  });

  it('aguarda o lock da reserva e revalida o cancelamento confirmado antes de gravar', async () => {
    const appointment = await book();
    await prisma.appointment.update({
      where: { id: appointment.id },
      data: { createdAt: new Date('2030-01-01T12:00:00.000Z') },
    });
    const clock = { now: () => new Date('2030-01-06T12:00:00.000Z') };
    await new ScheduleAppointmentRemindersUseCase.UseCase(
      new AppointmentReminderPrismaRepository(prisma),
      clock,
    ).execute();
    const event = await prisma.notificationOutbox.findFirstOrThrow({
      where: { type: 'appointment_reminder' },
    });
    let release!: () => void;
    let reached!: () => void;
    const resume = new Promise<void>((resolve) => {
      release = resolve;
    });
    const locked = new Promise<void>((resolve) => {
      reached = resolve;
    });
    const cancellation = prisma.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT "id" FROM "Appointment" WHERE "id" = ${appointment.id} FOR UPDATE`;
        await tx.appointment.update({
          where: { id: appointment.id },
          data: { status: 'cancelled', version: { increment: 1 } },
        });
        reached();
        await resume;
      },
      { timeout: 15_000 },
    );
    await locked;
    const pending = new NotificationOutboxPrismaRepository(
      prisma,
      clock,
    ).deliver(event.id);
    try {
      let waiting = false;
      for (let attempt = 0; attempt < 200 && !waiting; attempt++) {
        const [activity] = await prisma.$queryRaw<{ waiting: boolean }[]>`
          SELECT EXISTS (
            SELECT 1 FROM pg_stat_activity
            WHERE datname = current_database() AND pid <> pg_backend_pid()
              AND state = 'active' AND wait_event_type = 'Lock'
              AND query LIKE '%Appointment%FOR UPDATE%'
          ) AS waiting`;
        waiting = activity.waiting;
        if (!waiting) await new Promise((resolve) => setTimeout(resolve, 25));
      }
      expect(waiting).toBe(true);
      expect(
        await prisma.notification.count({
          where: { type: 'appointment_reminder' },
        }),
      ).toBe(0);
    } finally {
      release();
      await cancellation;
    }
    await pending;
    expect(
      await prisma.notification.count({
        where: { type: 'appointment_reminder' },
      }),
    ).toBe(0);
    expect(
      (
        await prisma.notificationOutbox.findUniqueOrThrow({
          where: { id: event.id },
        })
      ).processedAt,
    ).toEqual(clock.now());
  });
});
