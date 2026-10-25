import { BullModule, getQueueToken } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { DatabaseModule } from '@/shared/infrastructure/database/database.module';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { NotificationOutboxRepository } from '../application/ports/notification-outbox.repository';
import { PublishPendingNotificationsUseCase } from '../application/usecases/publish-pending-notifications.usecase';
import { NotificationOutboxPrismaRepository } from './database/prisma/notification-outbox-prisma.repository';
import { NotificationBullMqQueue } from './queue/notification-bullmq.queue';
import {
  notificationQueueConfig,
  NOTIFICATIONS_QUEUE,
} from './queue/notification-queue.config';
import { NotificationProcessor } from './queue/notification.processor';
import { NotificationScheduler } from './queue/notification-scheduler';

@Module({
  imports: [
    DatabaseModule,
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: notificationQueueConfig,
    }),
    BullModule.registerQueue({ name: NOTIFICATIONS_QUEUE }),
  ],
  providers: [
    {
      provide: 'NotificationOutboxRepository',
      useFactory: (prisma: PrismaService) =>
        new NotificationOutboxPrismaRepository(prisma),
      inject: [PrismaService],
    },
    {
      provide: PublishPendingNotificationsUseCase.UseCase,
      useFactory: (outbox: NotificationOutboxRepository, queue: Queue) =>
        new PublishPendingNotificationsUseCase.UseCase(
          outbox,
          new NotificationBullMqQueue(queue),
        ),
      inject: [
        'NotificationOutboxRepository',
        getQueueToken(NOTIFICATIONS_QUEUE),
      ],
    },
    NotificationProcessor,
    NotificationScheduler,
  ],
})
export class NotificationWorkerModule {}
