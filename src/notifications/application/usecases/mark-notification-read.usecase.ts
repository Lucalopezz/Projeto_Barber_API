import { UseCaseContract } from '@/shared/application/usecases/use-case';
import { Clock, systemClock } from '@/shared/application/providers/clock';
import { NotFoundError } from '@/shared/domain/errors/not-found-error';
import { NotificationRepository } from '../../domain/repositories/notification.repository';
import {
  NotificationOutput,
  NotificationOutputMapper,
} from '../dto/notification-output.dto';

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace MarkNotificationReadUseCase {
  export type Input = { userId: string; id: string };
  export type Output = NotificationOutput;

  export class UseCase implements UseCaseContract<Input, Output> {
    constructor(
      private readonly repository: NotificationRepository,
      private readonly clock: Clock = systemClock,
    ) {}
    async execute(input: Input): Promise<Output> {
      const entity = await this.repository.markAsRead(
        input.userId,
        input.id,
        this.clock.now(),
      );
      if (!entity) throw new NotFoundError('Notification not found');
      return NotificationOutputMapper.toOutput(entity);
    }
  }
}
