import {
  IsDate,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsUUID,
} from 'class-validator';
import { AppointmentStatus } from '../entities/appointmentStatus.enum';
import { ClassValidatorFields } from '@/shared/domain/validators/class-validator-fields';
import { AppointmentProps } from '../entities/appointment.entity';

export class AppointmentRules {
  @IsDate()
  @IsNotEmpty()
  date: Date;

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
  barberShopId: string;

  @IsDate()
  @IsOptional()
  createdAt?: Date;

  constructor({
    date,
    status,
    clientId,
    serviceId,
    barberShopId,
    createdAt,
  }: AppointmentProps) {
    Object.assign(this, {
      date,
      status,
      clientId,
      serviceId,
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
