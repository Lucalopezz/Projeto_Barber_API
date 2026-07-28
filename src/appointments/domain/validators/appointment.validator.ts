import {
  IsDate,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsUUID,
} from 'class-validator';
import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
  Validate,
} from 'class-validator';
import { AppointmentStatus } from '../entities/appointmentStatus.enum';
import { ClassValidatorFields } from '@/shared/domain/validators/class-validator-fields';
import { AppointmentProps } from '../entities/appointment.entity';

// Creates a custom validator to check if endDate is after date
@ValidatorConstraint({ name: 'endDateAfterStart', async: false })
class EndDateAfterStartValidator implements ValidatorConstraintInterface {
  validate(endDate: Date, args: ValidationArguments): boolean {
    const props = args.object as AppointmentProps;
    return (
      endDate instanceof Date &&
      props.date instanceof Date &&
      endDate.getTime() > props.date.getTime()
    );
  }

  defaultMessage(): string {
    return 'endDate must be after date';
  }
}

export class AppointmentRules {
  @IsDate()
  @IsNotEmpty()
  date: Date;

  @IsDate()
  @IsNotEmpty()
  @Validate(EndDateAfterStartValidator)
  endDate: Date;

  @IsNotEmpty()
  @IsEnum(AppointmentStatus)
  status: AppointmentStatus;

  @IsNotEmpty()
  @IsUUID()
  clientId: string;

  @IsNotEmpty()
  @IsUUID()
  serviceId: string;

  @IsNotEmpty()
  @IsUUID()
  barberId: string;

  @IsNotEmpty()
  @IsUUID()
  barberShopId: string;

  @IsDate()
  @IsOptional()
  createdAt?: Date;

  constructor({
    date,
    endDate,
    status,
    clientId,
    serviceId,
    barberId,
    barberShopId,
    createdAt,
  }: AppointmentProps) {
    Object.assign(this, {
      date,
      endDate,
      status,
      clientId,
      serviceId,
      barberId,
      barberShopId,
      createdAt,
    });
  }
}

export class AppointmentValidator extends ClassValidatorFields<AppointmentRules> {
  validate(data: AppointmentProps): boolean {
    return super.validate(
      new AppointmentRules(data ?? ({} as AppointmentProps)),
    );
  }
}

export class AppointmentValidatorFactory {
  static create(): AppointmentValidator {
    return new AppointmentValidator();
  }
}
