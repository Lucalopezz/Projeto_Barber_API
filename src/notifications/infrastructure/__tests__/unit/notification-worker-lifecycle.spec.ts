import { BullRegistrar, getQueueToken } from '@nestjs/bullmq';
import { Test } from '@nestjs/testing';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { NotificationWorkerModule } from '../../notification-worker.module';
import { NotificationProcessor } from '../../queue/notification.processor';
import { NOTIFICATIONS_QUEUE } from '../../queue/notification-queue.config';

describe('Encerramento do contexto do worker', () => {
  it('aguarda o job ativo terminar antes de desconectar o Prisma', async () => {
    const order: string[] = [];
    let release: () => void;
    const activeJob = new Promise<void>((resolve) => {
      release = resolve;
    });
    const worker = {
      close: jest.fn(async () => {
        order.push('worker-closing');
        await activeJob;
        order.push('worker-closed');
      }),
    };
    const database = {
      onModuleDestroy: jest.fn(async () => {
        order.push('database-disconnected');
      }),
    };
    const moduleRef = await Test.createTestingModule({
      imports: [NotificationWorkerModule],
    })
      .overrideProvider(PrismaService)
      .useValue(database)
      .overrideProvider(NotificationProcessor)
      .useValue({ worker })
      .overrideProvider(BullRegistrar)
      .useValue({ onModuleInit: () => undefined })
      .overrideProvider(getQueueToken(NOTIFICATIONS_QUEUE))
      .useValue({ upsertJobScheduler: jest.fn().mockResolvedValue(undefined) })
      .compile();

    await moduleRef.init();
    const shutdown = moduleRef.close();
    try {
      await new Promise((resolve) => setImmediate(resolve));
      expect(order).toEqual(['worker-closing']);
      expect(database.onModuleDestroy).not.toHaveBeenCalled();
    } finally {
      release();
      await shutdown;
    }
    expect(order).toEqual([
      'worker-closing',
      'worker-closed',
      'database-disconnected',
    ]);
  });
});
