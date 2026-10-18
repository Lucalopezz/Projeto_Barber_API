import { Entity } from '@/shared/domain/entities/entity';
import { EntityValidationError } from '@/shared/domain/errors/validation-error';
import { BarberTimeOffValidatorFactory } from '../validators/barber-time-off.validator';

import type { BarberTimeOffProps } from './barber-time-off.props';
export type { BarberTimeOffProps } from './barber-time-off.props';

export class BarberTimeOffEntity extends Entity<BarberTimeOffProps> {
  constructor(
    public readonly props: BarberTimeOffProps,
    id?: string,
  ) {
    BarberTimeOffEntity.validate(props);
    super(props, id);
    this.props.reason = this.props.reason ?? null;
  }

  get barberId(): string {
    return this.props.barberId;
  }

  get startsAt(): Date {
    return this.props.startsAt;
  }

  get endsAt(): Date {
    return this.props.endsAt;
  }

  get reason(): string | null {
    return this.props.reason;
  }

  static validate(props: BarberTimeOffProps): void {
    const validator = BarberTimeOffValidatorFactory.create();
    if (!validator.validate(props)) {
      throw new EntityValidationError(validator.errors);
    }
  }
}
