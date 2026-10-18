import { Entity } from '@/shared/domain/entities/entity';
import { AppointmentStatus } from './appointmentStatus.enum';
import { AppointmentValidatorFactory } from '../validators/appointment.validator';
import { EntityValidationError } from '@/shared/domain/errors/validation-error';
import { ConflictError } from '@/shared/domain/errors/conflict-error';

import type { AppointmentProps } from './appointment.props';
export type { AppointmentProps } from './appointment.props';

export class AppointmentEntity extends Entity<AppointmentProps> {
  #state: AppointmentProps;

  constructor(props: AppointmentProps, id?: string) {
    AppointmentEntity.validate(props);
    const state = AppointmentEntity.copy(props);
    state.createdAt ??= new Date();
    super(state, id);
    this.#state = state;

    // Preserve the shared Entity contract while preventing writes through props.
    // Dates also need copies: Object.freeze alone cannot protect Date#setTime.
    Object.defineProperty(this, 'props', {
      get: () => AppointmentEntity.copy(this.#state),
      configurable: false,
      enumerable: true,
    });
  }

  updateStatus(status: AppointmentStatus): void {
    this.assertScheduled();
    const updatedProps = { ...this.#state, status };
    AppointmentEntity.validate(updatedProps);
    this.#state = updatedProps;
  }

  update(date?: Date, serviceId?: string, endDate?: Date): void {
    this.assertScheduled();
    const updatedProps = {
      ...this.#state,
      ...(date !== undefined && { date }),
      ...(serviceId !== undefined && { serviceId }),
      ...(endDate !== undefined && { endDate }),
    };
    AppointmentEntity.validate(updatedProps);
    this.#state = AppointmentEntity.copy(updatedProps);
  }

  get date(): Date {
    return new Date(this.#state.date);
  }
  get endDate(): Date {
    return new Date(this.#state.endDate);
  }
  get status(): AppointmentStatus {
    return this.#state.status;
  }
  get clientId(): string {
    return this.#state.clientId;
  }
  get serviceId(): string {
    return this.#state.serviceId;
  }
  get barberId(): string {
    return this.#state.barberId;
  }
  get barberShopId(): string {
    return this.#state.barberShopId;
  }
  get createdAt(): Date {
    return new Date(this.#state.createdAt);
  }

  private assertScheduled(): void {
    if (this.#state.status !== AppointmentStatus.scheduled) {
      throw new ConflictError('Only scheduled appointments can be changed');
    }
  }

  private static copy(props: AppointmentProps): AppointmentProps {
    return {
      ...props,
      date: new Date(props.date),
      endDate: new Date(props.endDate),
      ...(props.createdAt !== undefined && {
        createdAt: new Date(props.createdAt),
      }),
    };
  }

  static validate(props: AppointmentProps) {
    const appointmentValidator = AppointmentValidatorFactory.create();
    const isValid = appointmentValidator.validate(props);
    if (!isValid) {
      throw new EntityValidationError(appointmentValidator.errors);
    }
  }
}
