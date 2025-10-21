import { Entity } from '@/shared/domain/entities/entity';
import { AppointmentStatus } from './appointmentStatus.enum';
import { AppointmentValidatorFactory } from '../validators/appointment.validator';
import { EntityValidationError } from '@/shared/domain/errors/validation-error';

export type AppointmentProps = {
  date: Date;
  status: AppointmentStatus;
  clientId: string;
  serviceId: string;
  barberShopId: string;
  createdAt?: Date;
};

export class AppointmentEntity extends Entity<AppointmentProps> {
  constructor(
    public readonly props: AppointmentProps,
    id?: string,
  ) {
    AppointmentEntity.validate(props);
    super(props, id);
    this.props.createdAt = this.props.createdAt ?? new Date();
  }
  updateStatus(status: AppointmentStatus): void {
    AppointmentEntity.validate({ ...this.props, status });
    this.props.status = status;
  }
  update(date?: Date, serviceId?: string): void {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const updatedProps = {
      ...this.props,
      ...(date !== undefined && { date }),
      ...(serviceId !== undefined && { serviceId }),
    };

    AppointmentEntity.validate(updatedProps);

    if (date !== undefined) this.props.date = date;
    if (serviceId !== undefined) this.props.serviceId = serviceId;
  }
  get date(): Date {
    return this.props.date;
  }
  private set date(value: Date) {
    this.props.date = value;
  }
  get status(): string {
    return this.props.status;
  }
  private set status(value: AppointmentStatus) {
    this.props.status = value;
  }
  get clientId(): string {
    return this.props.clientId;
  }
  private set clientId(value: string) {
    this.props.clientId = value;
  }
  get serviceId(): string {
    return this.props.serviceId;
  }
  private set serviceId(value: string) {
    this.props.serviceId = value;
  }
  get barberShopId(): string {
    return this.props.barberShopId;
  }
  private set barberShopId(value: string) {
    this.props.barberShopId = value;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }
  private set createdAt(value: Date) {
    this.props.createdAt = value;
  }

  static validate(props: AppointmentProps) {
    const appointmentValidator = AppointmentValidatorFactory.create();
    const isValid = appointmentValidator.validate(props);
    if (!isValid) {
      throw new EntityValidationError(appointmentValidator.errors);
    }
  }
}
