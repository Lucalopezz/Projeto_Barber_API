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
import { AppointmentsPrismaRepository } from '@/appointments/infrastructure/database/prisma/repositories/appointments-prisma.repository';
import { BarberAvailabilityPrismaRepository } from '@/appointments/infrastructure/database/prisma/repositories/barber-availability-prisma.repository';
import { ProfessionalBookingPrismaTransaction } from '@/appointments/infrastructure/database/prisma/professional-booking-prisma.transaction';
import { NotificationOutboxPrismaRepository } from '../../notification-outbox-prisma.repository';
import { NotificationPrismaRepository } from '../../notification-prisma.repository';

describe('Confirmações transacionais e idempotência (PostgreSQL real)', () => {
  const prisma = new PrismaService();
  let ready = false;
  let ownerId: string;
  let barberId: string;
  let clientId: string;
  let shopId: string;
  let serviceId: string;
  let create: CreateAppointmentsUseCase.UseCase;
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
  });

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
});
