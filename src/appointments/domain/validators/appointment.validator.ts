import {
  IsDate,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsUUID,
} from 'class-validator';
import { AppointmentStatus } from '../entities/appointmentStatus.enum';
import { ApointmentProps } from '../entities/appointment.entity';
import { ClassValidatorFields } from '@/shared/domain/validators/class-validator-fields';

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
  barberId: string;

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
    barberId,
    barberShopId,
    createdAt,
  }: ApointmentProps) {
    Object.assign(this, {
      date,
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
  validate(data: ApointmentProps): boolean {
    return super.validate(
      new AppointmentRules(data ?? ({} as ApointmentProps)),
    );
  }
}

export class AppointmentValidatorFactory {
  static create(): AppointmentValidator {
    return new AppointmentValidator();
  }
}
