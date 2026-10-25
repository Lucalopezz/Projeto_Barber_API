import {
  IsDate,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsTimeZone,
  IsUUID,
} from 'class-validator';
import { ClassValidatorFields } from '@/shared/domain/validators/class-validator-fields';
import {
  NotificationProps,
  NotificationType,
} from '../entities/notification.props';

class NotificationRules {
  @IsUUID() userId: string;
  @IsUUID() appointmentId: string;
  @IsString() @IsNotEmpty() eventKey: string;
  @IsEnum(NotificationType) type: NotificationType;
  @IsString() @IsNotEmpty() serviceName: string;
  @IsString() @IsNotEmpty() barberShopName: string;
  @IsDate() startsAt: Date;
  @IsTimeZone() timezone: string;
  @IsOptional() @IsDate() createdAt?: Date;
  @IsOptional() @IsDate() readAt?: Date | null;

  constructor(props: NotificationProps) {
    Object.assign(this, props);
  }
}

export class NotificationValidator extends ClassValidatorFields<NotificationRules> {
  validate(props: NotificationProps): boolean {
    return super.validate(new NotificationRules(props));
  }
}

export class NotificationValidatorFactory {
  static create(): NotificationValidator {
    return new NotificationValidator();
  }
}
