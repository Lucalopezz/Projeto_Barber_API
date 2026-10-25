import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import {
  NOTIFICATIONS_QUEUE,
  notificationQueueConfig,
} from './infrastructure/queue/notification-queue.config';
import { NotificationQueueOperations } from './infrastructure/queue/notification-queue-operations';

function printUsage(): void {
  console.error(
    'Usage: pnpm notifications:ops <status | replay <outbox-event-id>>',
  );
  process.exitCode = 2;
}

async function main(): Promise<void> {
  const [command, eventId, extra] = process.argv.slice(2);
  if (
    (command !== 'status' && command !== 'replay') ||
    (command === 'status' && (eventId || extra)) ||
    (command === 'replay' && (!eventId || extra))
  ) {
    printUsage();
    return;
  }

  const config = {
    get: (name: string) => process.env[name],
  } as ConfigService;
  const queueConfig = notificationQueueConfig(config);
  const queue = new Queue(NOTIFICATIONS_QUEUE, {
    ...queueConfig,
    connection: {
      ...queueConfig.connection,
      // Diagnostics should report Redis outages promptly; the worker keeps
      // its normal reconnect policy so durable jobs resume automatically.
      maxRetriesPerRequest: 1,
      connectTimeout: 3_000,
      retryStrategy: (attempt: number) =>
        attempt > 3 ? null : Math.min(attempt * 250, 1_000),
    },
  });
  queue.on('error', () => undefined);
  const prisma = new PrismaService();
  try {
    const operations = new NotificationQueueOperations(queue, prisma);
    if (command === 'status') {
      console.log(JSON.stringify(await operations.getStatus(), null, 2));
      return;
    }
    await Promise.all([queue.waitUntilReady(), prisma.$connect()]);
    const result = await operations.replayEvent(eventId);
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    const safeMessage =
      error instanceof Error &&
        [
          'Notification event not found',
          'Notification event already processed',
          'Job is not a notification delivery',
        ].includes(error.message)
        ? error.message
        : 'Notification operations failed. Check PostgreSQL, Redis, and the event ID.';
    console.error(safeMessage);
    process.exitCode = 1;
  } finally {
    await Promise.allSettled([queue.close(), prisma.$disconnect()]);
  }
}

void main();
