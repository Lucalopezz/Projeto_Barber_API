import { Logger } from '@nestjs/common';
import { NotificationProcessor } from '../../notification.processor';
import { NotificationQueueOperations } from '../../notification-queue-operations';

describe('NotificationQueueOperations', () => {
  const now = new Date('2030-01-01T12:00:00.000Z');
  const eventId = '0c7b9b1a-b138-4dd2-8cae-14c453d6d82d';
  const jobId = `notification-${eventId}`;

  function setup() {
    const queue = {
      getJobCounts: jest.fn().mockResolvedValue({
        waiting: 2,
        active: 1,
        delayed: 3,
        failed: 1,
        paused: 0,
        'waiting-children': 0,
        prioritized: 0,
      }),
      getFailed: jest.fn().mockResolvedValue([
        {
          id: jobId,
          name: 'deliver-notification',
          data: { eventId, accessToken: 'must-not-leak' },
          opts: { attempts: 5 },
          attemptsMade: 5,
          finishedOn: now.getTime() - 1_000,
          failedReason: 'private database contents',
        },
      ]),
      getJob: jest.fn(),
      add: jest.fn().mockResolvedValue(undefined),
    };
    const prisma = {
      notificationOutbox: {
        count: jest.fn().mockResolvedValue(4),
        findFirst: jest.fn().mockResolvedValue({
          id: eventId,
          createdAt: new Date(now.getTime() - 60_000),
        }),
        findUnique: jest
          .fn()
          .mockResolvedValue({ id: eventId, processedAt: null }),
      },
    };
    const operations = new NotificationQueueOperations(
      queue as any,
      prisma as any,
      { now: () => now },
    );
    return { operations, queue, prisma };
  }

  it('reports queue states and pending outbox age without exposing job payloads or errors', async () => {
    const { operations } = setup();

    const status = await operations.getStatus();

    expect(status).toEqual({
      queue: {
        available: true,
        waiting: 2,
        active: 1,
        delayed: 3,
        failed: 1,
        paused: 0,
        waitingChildren: 0,
        prioritized: 0,
        recentFailedJobsAvailable: true,
      },
      outbox: {
        available: true,
        pending: 4,
        oldestPendingCreatedAt: '2030-01-01T11:59:00.000Z',
        oldestPendingEventId: eventId,
        oldestPendingAgeMs: 60_000,
      },
      failedJobs: [
        {
          jobId,
          name: 'deliver-notification',
          eventId,
          attemptsMade: 5,
          maxAttempts: 5,
          failedAt: '2030-01-01T11:59:59.000Z',
        },
      ],
    });
    expect(JSON.stringify(status)).not.toContain('must-not-leak');
    expect(JSON.stringify(status)).not.toContain('private database contents');
  });

  it('publishes a pending outbox event when its failed Redis job has expired', async () => {
    const { operations, queue } = setup();
    queue.getJob.mockResolvedValue(undefined);

    await expect(operations.replayEvent(eventId)).resolves.toEqual({
      eventId,
      jobId,
      action: 'enqueued',
    });

    expect(queue.add).toHaveBeenCalledWith(
      'deliver-notification',
      { eventId },
      { jobId },
    );
  });

  it('still reports the durable outbox when Redis is unavailable', async () => {
    const { operations, queue } = setup();
    queue.getJobCounts.mockRejectedValue(
      new Error('private Redis connection string'),
    );
    queue.getFailed.mockRejectedValue(
      new Error('private Redis connection string'),
    );

    const status = await operations.getStatus();

    expect(status.queue).toEqual({
      available: false,
      waiting: null,
      active: null,
      delayed: null,
      failed: null,
      paused: null,
      waitingChildren: null,
      prioritized: null,
      recentFailedJobsAvailable: false,
    });
    expect(status.outbox).toEqual({
      available: true,
      pending: 4,
      oldestPendingCreatedAt: '2030-01-01T11:59:00.000Z',
      oldestPendingEventId: eventId,
      oldestPendingAgeMs: 60_000,
    });
    expect(JSON.stringify(status)).not.toContain(
      'private Redis connection string',
    );
  });

  it.each(['failed', 'completed'])(
    'retries the existing %s delivery job with a clean attempt budget',
    async (state) => {
      const { operations, queue } = setup();
      const retry = jest.fn().mockResolvedValue(undefined);
      queue.getJob.mockResolvedValue({
        id: jobId,
        queueName: 'notifications',
        name: 'deliver-notification',
        data: { eventId },
        getState: jest.fn().mockResolvedValue(state),
        retry,
      });

      await expect(operations.replayEvent(eventId)).resolves.toEqual({
        eventId,
        jobId,
        action: 'retried',
        previousState: state,
      });

      expect(retry).toHaveBeenCalledWith(state, { resetAttemptsMade: true });
      expect(queue.add).not.toHaveBeenCalled();
    },
  );

  it.each([
    'waiting',
    'active',
    'delayed',
    'paused',
    'waiting-children',
    'prioritized',
  ])('does not duplicate a job already in %s state', async (state) => {
    const { operations, queue } = setup();
    queue.getJob.mockResolvedValue({
      id: jobId,
      queueName: 'notifications',
      name: 'deliver-notification',
      data: { eventId },
      getState: jest.fn().mockResolvedValue(state),
      retry: jest.fn(),
    });

    await expect(operations.replayEvent(eventId)).resolves.toEqual({
      eventId,
      jobId,
      action: 'already-queued',
      state,
    });
    expect(queue.add).not.toHaveBeenCalled();
  });

  it('rejects unknown or already processed outbox events', async () => {
    const { operations, prisma, queue } = setup();
    prisma.notificationOutbox.findUnique.mockResolvedValueOnce(null);
    await expect(operations.replayEvent(eventId)).rejects.toThrow(
      'Notification event not found',
    );

    prisma.notificationOutbox.findUnique.mockResolvedValueOnce({
      id: eventId,
      processedAt: now,
    });
    await expect(operations.replayEvent(eventId)).rejects.toThrow(
      'Notification event already processed',
    );
    expect(queue.getJob).not.toHaveBeenCalled();
    expect(queue.add).not.toHaveBeenCalled();
  });

  it('does not reprocess a scheduler job that happens to use the same Redis id', async () => {
    const { operations, queue } = setup();
    queue.getJob.mockResolvedValue({
      id: jobId,
      queueName: 'notifications',
      name: 'publish-outbox',
      data: {},
      getState: jest.fn().mockResolvedValue('failed'),
      retry: jest.fn(),
    });

    await expect(operations.replayEvent(eventId)).rejects.toThrow(
      'Job is not a notification delivery',
    );
    expect(queue.add).not.toHaveBeenCalled();
  });

  it('logs terminal job metadata without including payload or the error message', async () => {
    const loggerError = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
    const loggerWarn = jest
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => undefined);
    const processor = new NotificationProcessor(
      {} as any,
      {} as any,
      {} as any,
    );
    const job = {
      id: jobId,
      name: 'deliver-notification',
      data: { eventId, accessToken: 'must-not-leak' },
      opts: { attempts: 5 },
      attemptsMade: 4,
    };

    processor.onFailed(job as any, new Error('private database contents'));
    processor.onFailed(
      { ...job, attemptsMade: 5 } as any,
      new Error('private database contents'),
    );

    expect(loggerWarn).toHaveBeenCalledTimes(1);
    expect(loggerError).toHaveBeenCalledTimes(1);
    const output = JSON.stringify([
      ...loggerWarn.mock.calls,
      ...loggerError.mock.calls,
    ]);
    expect(output).toContain('terminal');
    expect(output).not.toContain('must-not-leak');
    expect(output).not.toContain('private database contents');
    loggerError.mockRestore();
    loggerWarn.mockRestore();
  });
});
