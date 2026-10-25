import { NotificationRepository } from '../../domain/repositories/notification.repository';
import { NotificationProps } from '../../domain/entities/notification.props';
import { SearchParams } from '@/shared/domain/repositories/searchable.repository';
import {
  PaginationOutput,
  PaginationOutputMapper,
} from '@/shared/application/dtos/pagination-output';
import { UseCaseContract } from '@/shared/application/usecases/use-case';

export type NotificationOutput = Omit<
  NotificationProps,
  'eventKey' | 'userId'
> & { id: string };

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace ListNotificationsUseCase {
  export type Input = { userId: string; page?: number; perPage?: number };
  export type Output = PaginationOutput<NotificationOutput>;

  export class UseCase implements UseCaseContract<Input, Output> {
    constructor(private readonly repository: NotificationRepository) {}
    async execute(input: Input): Promise<Output> {
      const result = await this.repository.listByUser(
        input.userId,
        new SearchParams({
          page: input.page,
          perPage: Math.min(input.perPage ?? 15, 100),
        }),
      );
      const items = result.items.map((entity): NotificationOutput => {
        const {
          id,
          appointmentId,
          type,
          serviceName,
          barberShopName,
          startsAt,
          timezone,
          createdAt,
          readAt,
        } = entity.toJSON();
        return {
          id,
          appointmentId,
          type,
          serviceName,
          barberShopName,
          startsAt,
          timezone,
          createdAt,
          readAt,
        };
      });
      return PaginationOutputMapper.toOutput(items, result);
    }
  }
}
