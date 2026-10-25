import { randomUUID } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { Queue, Worker } from 'bullmq';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import {
  clearDatabase,
  setupPrismaTests,
} from '@/shared/infrastructure/database/testing/setup-prisma-tests';
import { UserEntity } from '@/users/domain/entities/user.entity';
import { UserDataBuilder } from '@/users/domain/helpers/user-data-builder';
import { Role } from '@/users/domain/entities/role.enum';
import { BarberShopEntity } from '@/barberShop/domain/entities/barber-shop.entity';
import { BarberShopDataBuilder } from '@/barberShop/domain/helpers/barberShop-data-builder';
import { BarberShopPrismaRepository } from '@/barberShop/infrastructure/database/prisma/repositories/barberShop-prisma.repository';
import { ServiceEntity } from '@/services/domain/entities/services.entity';
import { ServiceDataBuilder } from '@/services/domain/helpers/service-data-builder';
import { AppointmentEntity } from '@/appointments/domain/entities/appointment.entity';
import { AppointmentDataBuilder } from '@/appointments/domain/helpers/appointment-data-builder';
import { NotificationOutboxPrismaRepository } from '../../../database/prisma/notification-outbox-prisma.repository';
import { PublishPendingNotificationsUseCase } from '../../../../application/usecases/publish-pending-notifications.usecase';
import { NotificationBullMqQueue } from '../../notification-bullmq.queue';
import { NotificationProcessor } from '../../notification.processor';
import { NotificationScheduler } from '../../notification-scheduler';
import {
  DELIVER_NOTIFICATION_JOB,
  NOTIFICATIONS_QUEUE,
  OUTBOX_SCHEDULER_ID,
  notificationQueueConfig,
} from '../../notification-queue.config';

async function eventually(assertion: () => Promise<void>): Promise<void> {
  const deadline = Date.now() + 10_000;
  for (;;) {
    try {
      await assertion();
      return;
    } catch (error) {
      if (Date.now() >= deadline) throw error;
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
  }
}

describe('Publicação, recuperação e entrega (Redis e PostgreSQL reais)', () => {
  const prisma = new PrismaService();
  let ready = false;
  let queue: Queue;
  let worker: Worker | undefined;
  let eventId: string;
  let outbox: NotificationOutboxPrismaRepository;
  let publish: PublishPendingNotificationsUseCase.UseCase;
  let options: ReturnType<typeof notificationQueueConfig>;

  beforeAll(async () => {
    setupPrismaTests();
    await prisma.$connect();
    ready = true;
  });

  beforeEach(async () => {
    await clearDatabase(prisma);
    // Never FLUSHDB or reuse another suite's queue. Cleanup is limited to this UUID prefix.
    options = notificationQueueConfig(
      new ConfigService({
        ...process.env,
        NODE_ENV: 'test',
        NOTIFICATIONS_QUEUE_PREFIX: `barber-test-notifications-${randomUUID()}`,
      }),
    );
    queue = new Queue(NOTIFICATIONS_QUEUE, options);
    await queue.waitUntilReady();
    const owner = new UserEntity(UserDataBuilder({ role: Role.owner }));
    const client = new UserEntity(UserDataBuilder({ role: Role.client }));
    await prisma.user.createMany({ data: [owner.toJSON(), client.toJSON()] });
    const shop = new BarberShopEntity(
      BarberShopDataBuilder({ ownerId: owner.id }),
    );
    await new BarberShopPrismaRepository(prisma).insert(shop);
    const service = new ServiceEntity(
      ServiceDataBuilder({ barberShopId: shop.id, duration: 30 }),
    );
    await prisma.service.create({ data: service.toJSON() });
    const appointment = new AppointmentEntity(
      AppointmentDataBuilder({
        clientId: client.id,
        barberId: owner.id,
        barberShopId: shop.id,
        serviceId: service.id,
        date: new Date('2030-01-07T12:00:00.000Z'),
      }),
    );
    outbox = new NotificationOutboxPrismaRepository(prisma);
    await prisma.$transaction(async (tx) => {
      await tx.appointment.create({ data: appointment.toJSON() });
      await tx.notificationOutbox.create({
        data: {
          appointmentId: appointment.id,
          eventKey: `appointment-created-${appointment.id}`,
          type: 'appointment_created',
          recipientIds: [client.id, owner.id],
          serviceName: service.name,
          barberShopName: shop.name,
          startsAt: appointment.date,
          timezone: shop.timezone,
        },
      });
    });
    eventId = (await prisma.notificationOutbox.findFirstOrThrow()).id;
    publish = new PublishPendingNotificationsUseCase.UseCase(
      outbox,
      new NotificationBullMqQueue(queue),
    );
  });

  afterEach(async () => {
    await worker?.close();
    worker = undefined;
    if (queue) {
      await queue.obliterate({ force: true });
      await queue.close();
    }
  });

  afterAll(async () => {
    if (ready) await clearDatabase(prisma);
    await prisma.$disconnect();
  });

  function startWorker() {
    const processor = new NotificationProcessor(outbox, publish);
    worker = new Worker(NOTIFICATIONS_QUEUE, (job) => processor.process(job), {
      connection: options.connection,
      prefix: options.prefix,
      concurrency: 2,
    });
    return worker.waitUntilReady();
  }

  it('publica somente o ID do evento com jobId estável, sem duplicar jobs pendentes', async () => {
    await publish.execute();
    await publish.execute();
    const jobs = await queue.getJobs(['wait', 'delayed']);
    expect(jobs).toHaveLength(1);
    expect(jobs[0].id).toBe(`notification-${eventId}`);
    expect(jobs[0].name).toBe(DELIVER_NOTIFICATION_JOB);
    expect(jobs[0].data).toEqual({ eventId });
    expect(await prisma.notification.count()).toBe(0);
    expect(
      (
        await prisma.notificationOutbox.findUniqueOrThrow({
          where: { id: eventId },
        })
      ).processedAt,
    ).toBeNull();
  });

  it('recupera evento pendente ao iniciar o worker e não duplica após reinício e remoção do job', async () => {
    await publish.execute();
    await startWorker();
    await eventually(async () => {
      expect(await prisma.notification.count()).toBe(2);
      expect(
        (
          await prisma.notificationOutbox.findUniqueOrThrow({
            where: { id: eventId },
          })
        ).processedAt,
      ).not.toBeNull();
      expect(await queue.getJob(`notification-${eventId}`)).toBeUndefined();
    });
    await worker.close();
    worker = undefined;
    // A completed job was removed from Redis. PostgreSQL must still reject duplicate delivery.
    await new NotificationBullMqQueue(queue).enqueue(eventId);
    await startWorker();
    await eventually(async () => {
      expect(await queue.getJob(`notification-${eventId}`)).toBeUndefined();
    });
    expect(await prisma.notification.count()).toBe(2);
  });

  it('registra uma única rotina recorrente mesmo com inicializações concorrentes', async () => {
    const scheduler = new NotificationScheduler(queue);
    await Promise.all([scheduler.onModuleInit(), scheduler.onModuleInit()]);
    const schedulers = await queue.getJobSchedulers();
    expect(schedulers).toHaveLength(1);
    expect(schedulers[0].key).toBe(OUTBOX_SCHEDULER_ID);
    expect(schedulers[0].pattern).toBe('*/5 * * * * *');
    expect(schedulers[0].tz).toBe('UTC');
  });

  it('preserva a outbox quando Redis falha após o commit e recupera na tentativa seguinte', async () => {
    const offlineQueue = new Queue(NOTIFICATIONS_QUEUE, {
      prefix: options.prefix,
      connection: {
        host: '127.0.0.1',
        port: 1,
        db: options.connection.db,
        maxRetriesPerRequest: 0,
        retryStrategy: () => null,
        enableOfflineQueue: false,
        connectTimeout: 500,
      },
    });
    offlineQueue.on('error', () => undefined);
    try {
      const failedPublish = new PublishPendingNotificationsUseCase.UseCase(
        outbox,
        new NotificationBullMqQueue(offlineQueue),
      );
      await expect(failedPublish.execute()).rejects.toThrow();
      expect(await prisma.appointment.count()).toBe(1);
      expect(await outbox.findPending(undefined, 100)).toEqual([eventId]);
      expect(await prisma.notification.count()).toBe(0);
    } finally {
      await offlineQueue.close().catch(() => undefined);
    }
    await publish.execute();
    await startWorker();
    await eventually(async () =>
      expect(await prisma.notification.count()).toBe(2),
    );
  });
});
