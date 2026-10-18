import { Entity } from '@/shared/domain/entities/entity';
import { EntityValidationError } from '@/shared/domain/errors/validation-error';
import { BarberScheduleValidatorFactory } from '../validators/barber-schedule.validator';

import type { BarberScheduleProps } from './barber-schedule.props';
export type { BarberScheduleProps } from './barber-schedule.props';

export class BarberScheduleEntity extends Entity<BarberScheduleProps> {
  constructor(
    public readonly props: BarberScheduleProps,
    id?: string,
  ) {
    BarberScheduleEntity.validate(props);
    super(props, id);
  }

  get barberId(): string {
    return this.props.barberId;
  }

  get dayOfWeek(): number {
    return this.props.dayOfWeek;
  }

  get startMinute(): number {
    return this.props.startMinute;
  }

  get endMinute(): number {
    return this.props.endMinute;
  }

  static validate(props: BarberScheduleProps): void {
    const validator = BarberScheduleValidatorFactory.create();
    if (!validator.validate(props)) {
      throw new EntityValidationError(validator.errors);
    }
  }
}
