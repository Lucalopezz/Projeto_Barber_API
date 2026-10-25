import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject } from '@nestjs/common';
import { Job } from 'bullmq';
import { NotificationOutboxRepository } from '../../application/ports/notification-outbox.repository';
import { PublishPendingNotificationsUseCase } from '../../application/usecases/publish-pending-notifications.usecase';
import { ScheduleAppointmentRemindersUseCase } from '../../application/usecases/schedule-appointment-reminders.usecase';
import {
  DELIVER_NOTIFICATION_JOB,
  NOTIFICATIONS_QUEUE,
  PUBLISH_OUTBOX_JOB,
  SCHEDULE_REMINDERS_JOB,
} from './notification-queue.config';

@Processor(NOTIFICATIONS_QUEUE, { concurrency: 5 })
export class NotificationProcessor extends WorkerHost {
  constructor(
    @Inject('NotificationOutboxRepository')
    private readonly outbox: NotificationOutboxRepository,
    private readonly publish: PublishPendingNotificationsUseCase.UseCase,
    private readonly reminders: ScheduleAppointmentRemindersUseCase.UseCase,
  ) {
    super();
  }

  async process(job: Job<{ eventId?: string }>): Promise<void> {
    if (job.name === PUBLISH_OUTBOX_JOB) return this.publish.execute();
    if (job.name === SCHEDULE_REMINDERS_JOB) return this.reminders.execute();
    if (
      job.name === DELIVER_NOTIFICATION_JOB &&
      typeof job.data.eventId === 'string'
    )
      return this.outbox.deliver(job.data.eventId);
    throw new Error('Unknown notification job');
  }
}
