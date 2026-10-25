import { Entity } from '@/shared/domain/entities/entity';
import { NotificationProps } from './notification.props';
import { NotificationValidatorFactory } from '../validators/notification.validator';
import { EntityValidationError } from '@/shared/domain/errors/validation-error';

export class NotificationEntity extends Entity<NotificationProps> {
  constructor(props: NotificationProps, id?: string) {
    const validator = NotificationValidatorFactory.create();
    if (!validator.validate(props))
      throw new EntityValidationError(validator.errors);
    super(
      {
        ...props,
        createdAt: props.createdAt ?? new Date(),
        readAt: props.readAt ?? null,
      },
      id,
    );
  }
}
