import { Notification } from '@prisma/client';
import { NotificationEntity } from '../../../domain/entities/notification.entity';
import { NotificationType } from '../../../domain/entities/notification.props';

export class NotificationModelMapper {
  static toEntity(model: Notification): NotificationEntity {
    const { id, ...props } = model;
    return new NotificationEntity(
      { ...props, type: props.type as NotificationType },
      id,
    );
  }
  static toModel(entity: NotificationEntity): Notification {
    return entity.toJSON();
  }
}
