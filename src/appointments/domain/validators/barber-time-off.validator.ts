import {
  IsDate,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Validate,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { ClassValidatorFields } from '@/shared/domain/validators/class-validator-fields';
import type { BarberTimeOffProps } from '../entities/barber-time-off.entity';

@ValidatorConstraint({ name: 'timeOffEndAfterStart', async: false })
class TimeOffEndAfterStartValidator implements ValidatorConstraintInterface {
  validate(endsAt: Date, args: ValidationArguments): boolean {
    const timeOff = args.object as BarberTimeOffRules;
    return (
      endsAt instanceof Date &&
      !Number.isNaN(endsAt.getTime()) &&
      timeOff.startsAt instanceof Date &&
      !Number.isNaN(timeOff.startsAt.getTime()) &&
      endsAt.getTime() > timeOff.startsAt.getTime()
    );
  }

  defaultMessage(): string {
    return 'endsAt must be after startsAt';
  }
}

export class BarberTimeOffRules {
  @IsUUID()
  barberId: string;

  @IsDate()
  startsAt: Date;

  @IsDate()
  @Validate(TimeOffEndAfterStartValidator)
  endsAt: Date;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  reason?: string | null;

  constructor(props: BarberTimeOffProps) {
    Object.assign(this, props);
  }
}

export class BarberTimeOffValidator extends ClassValidatorFields<BarberTimeOffRules> {
  validate(props: BarberTimeOffProps): boolean {
    return super.validate(
      new BarberTimeOffRules(props ?? ({} as BarberTimeOffProps)),
    );
  }
}

export class BarberTimeOffValidatorFactory {
  static create(): BarberTimeOffValidator {
    return new BarberTimeOffValidator();
  }
}
