import { ConfigService } from '@nestjs/config';

export const NOTIFICATIONS_QUEUE = 'notifications';
export const PUBLISH_OUTBOX_JOB = 'publish-outbox';
export const DELIVER_NOTIFICATION_JOB = 'deliver-notification';
export const OUTBOX_SCHEDULER_ID = 'notification-outbox-publisher-v1';

export function notificationQueueConfig(config: ConfigService) {
  const test = config.get<string>('NODE_ENV') === 'test';
  const db = Number(config.get<string>('REDIS_DB') ?? (test ? 1 : 0));
  const port = Number(config.get<string>('REDIS_PORT') ?? 6380);
  const prefix =
    config.get<string>('NOTIFICATIONS_QUEUE_PREFIX') ??
    (test ? 'barber-test-notifications' : 'barber-notifications');
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    throw new Error('REDIS_PORT must be a valid port');
  if (!Number.isInteger(db) || db < 0 || db > 15)
    throw new Error('REDIS_DB must be between 0 and 15');
  if (!/^[a-zA-Z0-9_-]+$/.test(prefix))
    throw new Error('Invalid NOTIFICATIONS_QUEUE_PREFIX');
  if (test && (db === 0 || !prefix.startsWith('barber-test-')))
    throw new Error(
      'Tests require an isolated Redis database and barber-test- prefix',
    );
  return {
    prefix,
    connection: {
      host: config.get<string>('REDIS_HOST') ?? '127.0.0.1',
      port,
      db,
      password: config.get<string>('REDIS_PASSWORD') || undefined,
      maxRetriesPerRequest: null,
    },
    defaultJobOptions: {
      attempts: 5,
      backoff: { type: 'exponential', delay: 1000 },
      removeOnComplete: true,
      removeOnFail: 1000,
    },
  };
}
