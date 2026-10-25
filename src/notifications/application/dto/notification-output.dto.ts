import { NotificationEntity } from '../../domain/entities/notification.entity';
import { NotificationProps } from '../../domain/entities/notification.props';

export type NotificationOutput = Omit<
  NotificationProps,
  'eventKey' | 'userId' | 'previousStartsAt' | 'previousServiceName'
> & {
  id: string;
  previousStartsAt: Date | null;
  previousServiceName: string | null;
};

export class NotificationOutputMapper {
  static toOutput(entity: NotificationEntity): NotificationOutput {
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
      previousStartsAt,
      previousServiceName,
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
      previousStartsAt: previousStartsAt ?? null,
      previousServiceName: previousServiceName ?? null,
    };
  }
}
