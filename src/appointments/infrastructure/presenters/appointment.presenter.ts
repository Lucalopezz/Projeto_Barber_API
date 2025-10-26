import { AppointmentOutput } from '@/appointments/application/dto/appointments-output.dto';
import { ListAppointmentsUseCase } from '@/appointments/application/usecases/list-appointments.usecase';
import { AppointmentStatus } from '@/appointments/domain/entities/appointmentStatus.enum';
import { CollectionPresenter } from '@/shared/infrastructure/presenters/collection.presenter';
import { Transform } from 'class-transformer';

export class AppointmentPresenter {
  id: string;
  date: Date;

  clientId: string;
  serviceId: string;
  barberShopId: string;

  @Transform(({ value }: { value: AppointmentStatus }) =>
    value.toString().toLowerCase(),
  )
  status: AppointmentStatus;

  @Transform(({ value }: { value: Date }) => value.toISOString())
  createdAt: Date;

  constructor(output: AppointmentOutput) {
    this.id = output.id;
    this.date = output.date;
    this.clientId = output.clientId;
    this.serviceId = output.serviceId;
    this.barberShopId = output.barberShopId;
    this.status = output.status;
    this.createdAt = output.createdAt;
  }
}

export class AppointmentCollectionPresenter extends CollectionPresenter {
  data: AppointmentPresenter[];
  constructor(output: ListAppointmentsUseCase.Output) {
    const { items, ...paginationProps } = output;
    super(paginationProps);
    this.data = items.map((item) => new AppointmentPresenter(item));
  }
}
