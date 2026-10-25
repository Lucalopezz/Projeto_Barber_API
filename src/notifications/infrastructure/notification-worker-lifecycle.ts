import {
  Injectable,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from '@nestjs/common';
import { Worker } from 'bullmq';
import { NotificationProcessor } from './queue/notification.processor';

@Injectable()
export class NotificationWorkerLifecycle
  implements OnApplicationBootstrap, OnModuleDestroy
{
  private worker: Worker | undefined;

  constructor(private readonly processor: NotificationProcessor) {}

  onApplicationBootstrap(): void {
    // BullMQ creates the Worker during module initialization. A compiled-only
    // test context can close without reaching bootstrap or creating a Worker.
    this.worker = this.processor.worker;
  }

  async onModuleDestroy(): Promise<void> {
    // BullMQ's default shutdown hook runs after Prisma's destroy hook. Draining
    // here, in the worker's root module, keeps the database open for active jobs.
    await this.worker?.close();
  }
}
