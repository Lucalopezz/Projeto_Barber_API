import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Logger } from '@nestjs/common';
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
  private readonly logger = new Logger(NotificationProcessor.name);

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

  @OnWorkerEvent('failed')
  onFailed(job: Job<{ eventId?: string }> | undefined, error: Error): void {
    if (!job) {
      this.logger.error('Notification job failed without available metadata');
      return;
    }

    const maxAttempts = job.opts.attempts ?? 1;
    const terminal = job.attemptsMade >= maxAttempts;
    const details = JSON.stringify({
      jobId: job.id ?? null,
      jobName: job.name,
      attemptsMade: job.attemptsMade,
      maxAttempts,
      terminal,
      errorName: error.name,
    });
    const message = `Notification job failed ${details}`;

    // Error messages and job data can contain personal or secret values.
    // Keep operational logs to identifiers, retry counts, and the error class.
    if (terminal) this.logger.error(message);
    else this.logger.warn(message);
  }
}
