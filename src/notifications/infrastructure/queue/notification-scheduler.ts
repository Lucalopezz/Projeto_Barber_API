import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { Queue } from 'bullmq';
import {
  NOTIFICATIONS_QUEUE,
  OUTBOX_SCHEDULER_ID,
  PUBLISH_OUTBOX_JOB,
  REMINDER_SCHEDULER_ID,
  SCHEDULE_REMINDERS_JOB,
} from './notification-queue.config';

@Injectable()
export class NotificationScheduler implements OnModuleInit {
  constructor(
    @InjectQueue(NOTIFICATIONS_QUEUE) private readonly queue: Queue,
  ) {}
  async onModuleInit(): Promise<void> {
    // Stable upsert also works when multiple worker processes start together.
    await this.queue.upsertJobScheduler(
      OUTBOX_SCHEDULER_ID,
      { pattern: '*/5 * * * * *', tz: 'UTC' },
      { name: PUBLISH_OUTBOX_JOB, data: {} },
    );
    await this.queue.upsertJobScheduler(
      REMINDER_SCHEDULER_ID,
      { pattern: '* * * * *', tz: 'UTC' },
      { name: SCHEDULE_REMINDERS_JOB, data: {} },
    );
  }
}
