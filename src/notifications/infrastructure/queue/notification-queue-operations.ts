import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { Job, Queue } from 'bullmq';
import { Clock, systemClock } from '@/shared/application/providers/clock';
import {
  DELIVER_NOTIFICATION_JOB,
  NOTIFICATIONS_QUEUE,
} from './notification-queue.config';

const COUNTED_STATES = [
  'waiting',
  'active',
  'delayed',
  'failed',
  'paused',
  'waiting-children',
  'prioritized',
] as const;

export class NotificationQueueOperations {
  constructor(
    private readonly queue: Queue,
    private readonly prisma: PrismaService,
    private readonly clock: Clock = systemClock,
  ) {}

  async getStatus() {
    // Keep database backlog visible even if Redis metrics cannot be read.
    const [queueCounts, failedJobsResult, pending, oldest] =
      await Promise.allSettled([
        this.queue.getJobCounts(...COUNTED_STATES),
        this.queue.getFailed(0, 9),
        this.prisma.notificationOutbox.count({ where: { processedAt: null } }),
        this.prisma.notificationOutbox.findFirst({
          where: { processedAt: null },
          orderBy: { createdAt: 'asc' },
          select: { id: true, createdAt: true },
        }),
      ]);
    const now = this.clock.now().getTime();
    const counts =
      queueCounts.status === 'fulfilled' ? queueCounts.value : null;
    const failedJobs =
      failedJobsResult.status === 'fulfilled' ? failedJobsResult.value : null;

    return {
      queue: {
        available: counts !== null,
        waiting: counts?.waiting ?? null,
        active: counts?.active ?? null,
        delayed: counts?.delayed ?? null,
        failed: counts?.failed ?? null,
        paused: counts?.paused ?? null,
        waitingChildren: counts?.['waiting-children'] ?? null,
        prioritized: counts?.prioritized ?? null,
        recentFailedJobsAvailable: failedJobs !== null,
      },
      outbox: {
        available:
          pending.status === 'fulfilled' && oldest.status === 'fulfilled',
        pending: pending.status === 'fulfilled' ? pending.value : null,
        oldestPendingCreatedAt:
          oldest.status === 'fulfilled'
            ? (oldest.value?.createdAt.toISOString() ?? null)
            : null,
        oldestPendingEventId:
          oldest.status === 'fulfilled' ? (oldest.value?.id ?? null) : null,
        oldestPendingAgeMs:
          oldest.status === 'fulfilled' && oldest.value
            ? Math.max(0, now - oldest.value.createdAt.getTime())
            : null,
      },
      // Failed-job payloads and error messages can contain user data or secrets.
      // Expose only the event ID needed by the local replay command and safe metadata.
      failedJobs:
        failedJobs?.map((job) => ({
          jobId: job.id,
          name: job.name,
          eventId:
            typeof job.data?.eventId === 'string' ? job.data.eventId : null,
          attemptsMade: job.attemptsMade,
          maxAttempts: job.opts.attempts ?? 1,
          failedAt: job.finishedOn
            ? new Date(job.finishedOn).toISOString()
            : null,
        })) ?? null,
    };
  }

  async replayEvent(eventId: string) {
    const event = await this.prisma.notificationOutbox.findUnique({
      where: { id: eventId },
      select: { id: true, processedAt: true },
    });
    if (!event) throw new Error('Notification event not found');
    if (event.processedAt)
      throw new Error('Notification event already processed');

    const jobId = `notification-${event.id}`;
    const job = await this.queue.getJob(jobId);
    if (!job) {
      // Outbox is authoritative. Recreating the stable job ID is safe because
      // delivery checks processedAt transactionally and notification keys are unique.
      await this.queue.add(
        DELIVER_NOTIFICATION_JOB,
        { eventId: event.id },
        { jobId },
      );
      return { eventId: event.id, jobId, action: 'enqueued' as const };
    }

    this.assertDeliveryJob(job, event.id);
    const state = await job.getState();
    if (state === 'failed' || state === 'completed') {
      // Reset the exhausted retry budget while retaining BullMQ's dedupe ID.
      await job.retry(state, { resetAttemptsMade: true });
      return {
        eventId: event.id,
        jobId,
        action: 'retried' as const,
        previousState: state,
      };
    }

    if (
      [
        'waiting',
        'active',
        'delayed',
        'paused',
        'waiting-children',
        'prioritized',
      ].includes(state)
    )
      return {
        eventId: event.id,
        jobId,
        action: 'already-queued' as const,
        state,
      };

    throw new Error(`Unsupported notification job state: ${state}`);
  }

  private assertDeliveryJob(job: Job, eventId: string): void {
    if (
      job.name !== DELIVER_NOTIFICATION_JOB ||
      job.data?.eventId !== eventId ||
      job.queueName !== NOTIFICATIONS_QUEUE
    )
      throw new Error('Job is not a notification delivery');
  }
}
