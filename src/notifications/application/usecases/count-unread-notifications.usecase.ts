import { UseCaseContract } from '@/shared/application/usecases/use-case';
import { NotificationRepository } from '../../domain/repositories/notification.repository';

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace CountUnreadNotificationsUseCase {
  export type Input = { userId: string };
  export type Output = { count: number };

  export class UseCase implements UseCaseContract<Input, Output> {
    constructor(private readonly repository: NotificationRepository) {}
    async execute(input: Input): Promise<Output> {
      return { count: await this.repository.countUnread(input.userId) };
    }
  }
}
