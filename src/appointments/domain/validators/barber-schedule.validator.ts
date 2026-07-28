import {
  IsInt,
  IsUUID,
  Max,
  Min,
  Validate,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { ClassValidatorFields } from '@/shared/domain/validators/class-validator-fields';
import type { BarberScheduleProps } from '../entities/barber-schedule.entity';

@ValidatorConstraint({ name: 'endMinuteAfterStartMinute', async: false })
class EndMinuteAfterStartMinuteValidator
  implements ValidatorConstraintInterface
{
  validate(endMinute: number, args: ValidationArguments): boolean {
    const schedule = args.object as BarberScheduleRules;
    return (
      Number.isInteger(endMinute) &&
      Number.isInteger(schedule.startMinute) &&
      endMinute > schedule.startMinute
    );
  }

  defaultMessage(): string {
    return 'endMinute must be greater than startMinute';
  }
}

export class BarberScheduleRules {
  @IsUUID()
  barberId: string;

  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek: number;

  @IsInt()
  @Min(0)
  @Max(1439)
  startMinute: number;

  @IsInt()
  @Min(1)
  @Max(1440)
  @Validate(EndMinuteAfterStartMinuteValidator)
  endMinute: number;

  constructor(props: BarberScheduleProps) {
    Object.assign(this, props);
  }
}

export class BarberScheduleValidator extends ClassValidatorFields<BarberScheduleRules> {
  validate(props: BarberScheduleProps): boolean {
    return super.validate(
      new BarberScheduleRules(props ?? ({} as BarberScheduleProps)),
    );
  }
}

export class BarberScheduleValidatorFactory {
  static create(): BarberScheduleValidator {
    return new BarberScheduleValidator();
  }
}
