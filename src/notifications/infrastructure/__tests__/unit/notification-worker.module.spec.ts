import { getQueueToken } from '@nestjs/bullmq';
import { Test } from '@nestjs/testing';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { PublishPendingNotificationsUseCase } from '../../../application/usecases/publish-pending-notifications.usecase';
import { NotificationWorkerModule } from '../../notification-worker.module';
import { NotificationProcessor } from '../../queue/notification.processor';
import { NotificationScheduler } from '../../queue/notification-scheduler';
import {
  DELIVER_NOTIFICATION_JOB,
  NOTIFICATIONS_QUEUE,
  OUTBOX_SCHEDULER_ID,
  PUBLISH_OUTBOX_JOB,
} from '../../queue/notification-queue.config';

describe('Composição do worker separado, sem conexões externas', () => {
  it('resolve os providers reais e registra a publicação estável', async () => {
    const queue = {
      upsertJobScheduler: jest.fn().mockResolvedValue(undefined),
    };
    const moduleRef = await Test.createTestingModule({
      imports: [NotificationWorkerModule],
    })
      .overrideProvider(PrismaService)
      .useValue({})
      .overrideProvider(getQueueToken(NOTIFICATIONS_QUEUE))
      .useValue(queue)
      .compile();
    try {
      const processor = moduleRef.get(NotificationProcessor);
      const publish = moduleRef.get(PublishPendingNotificationsUseCase.UseCase);
      const outbox = moduleRef.get('NotificationOutboxRepository');
      jest.spyOn(publish, 'execute').mockResolvedValue(undefined);
      jest.spyOn(outbox, 'deliver').mockResolvedValue(undefined);

      await moduleRef.get(NotificationScheduler).onModuleInit();
      expect(queue.upsertJobScheduler).toHaveBeenCalledWith(
        OUTBOX_SCHEDULER_ID,
        { pattern: '*/5 * * * * *', tz: 'UTC' },
        { name: PUBLISH_OUTBOX_JOB, data: {} },
      );
      await processor.process({ name: PUBLISH_OUTBOX_JOB, data: {} } as any);
      expect(publish.execute).toHaveBeenCalledTimes(1);
      await processor.process({
        name: DELIVER_NOTIFICATION_JOB,
        data: { eventId: 'event-id' },
      } as any);
      expect(outbox.deliver).toHaveBeenCalledWith('event-id');
      await expect(
        processor.process({ name: 'unknown', data: {} } as any),
      ).rejects.toThrow('Unknown notification job');
    } finally {
      await moduleRef.close();
    }
  });
});
