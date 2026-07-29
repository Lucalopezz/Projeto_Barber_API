import { AppointmentOutput } from '@/appointments/application/dto/appointments-output.dto';
import { ListAppointmentsUseCase } from '@/appointments/application/usecases/list-appointments.usecase';
import { AppointmentStatus } from '@/appointments/domain/entities/appointmentStatus.enum';
import { CollectionPresenter } from '@/shared/infrastructure/presenters/collection.presenter';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class AppointmentPresenter {
  @ApiProperty({
    format: 'uuid',
    example: 'd3232127-6e16-405e-9475-ad3265c73380',
  })
  id: string;
  @ApiProperty({
    type: String,
    format: 'date-time',
    example: '2026-08-03T14:00:00.000Z',
  })
  @Transform(({ value }: { value: Date }) => value.toISOString())
  date: Date;
  @ApiProperty({ format: 'uuid' })
  clientId: string;
  @ApiProperty({ format: 'uuid' })
  barberId: string;
  @ApiProperty({ format: 'uuid' })
  barberShopId: string;
  @ApiProperty({ format: 'uuid' })
  serviceId: string;

  @ApiProperty({
    enum: AppointmentStatus,
    example: AppointmentStatus.scheduled,
  })
  @Transform(({ value }: { value: AppointmentStatus }) =>
    value.toString().toLowerCase(),
  )
  status: AppointmentStatus;

  @ApiProperty({
    type: String,
    format: 'date-time',
    example: '2026-08-03T14:45:00.000Z',
  })
  @Transform(({ value }: { value: Date }) => value.toISOString())
  endDate: Date;

  @ApiProperty({
    type: String,
    format: 'date-time',
    example: '2026-07-28T16:00:00.000Z',
  })
  @Transform(({ value }: { value: Date }) => value.toISOString())
  createdAt: Date;

  constructor(output: AppointmentOutput) {
    this.id = output.id;
    this.date = output.date;
    this.endDate = output.endDate;
    this.clientId = output.clientId;
    this.barberId = output.barberId;
    this.barberShopId = output.barberShopId;
    this.serviceId = output.serviceId;
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
