import { Queue } from 'bullmq';
import { NotificationQueue } from '../../application/usecases/publish-pending-notifications.usecase';
import { DELIVER_NOTIFICATION_JOB } from './notification-queue.config';

export class NotificationBullMqQueue implements NotificationQueue {
  constructor(private readonly queue: Queue) {}
  async enqueue(eventId: string): Promise<void> {
    await this.queue.add(
      DELIVER_NOTIFICATION_JOB,
      { eventId },
      { jobId: `notification-${eventId}` },
    );
  }
}
