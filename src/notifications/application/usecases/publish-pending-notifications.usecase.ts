import { NotificationOutboxRepository } from '../ports/notification-outbox.repository';
import { UseCaseContract } from '@/shared/application/usecases/use-case';

export interface NotificationQueue {
  enqueue(eventId: string): Promise<void>;
}

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace PublishPendingNotificationsUseCase {
  export type Input = void;
  export type Output = void;

  export class UseCase implements UseCaseContract<Input, Output> {
    constructor(
      private readonly outbox: NotificationOutboxRepository,
      private readonly queue: NotificationQueue,
    ) {}
    async execute(): Promise<Output> {
      let afterId: string | undefined;
      // Keyset pagination reaches later events even while earlier jobs await delivery.
      for (;;) {
        const ids = await this.outbox.findPending(afterId, 100);
        if (!ids.length) return;
        for (const id of ids) await this.queue.enqueue(id);
        afterId = ids[ids.length - 1];
      }
    }
  }
}
