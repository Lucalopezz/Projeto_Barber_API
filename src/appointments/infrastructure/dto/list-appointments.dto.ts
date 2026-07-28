import { ListAppointmentsUseCase } from '@/appointments/application/usecases/list-appointments.usecase';
import { SortDirection } from '@/shared/domain/repositories/searchable.repository';
import { Type } from 'class-transformer';
import { IsDate, IsOptional, IsString, IsUUID } from 'class-validator';

export class ListAppointmentsDto
  implements Omit<ListAppointmentsUseCase.Input, 'userId'>
{
  @IsOptional()
  page?: number;

  @IsOptional()
  perPage?: number;

  @IsOptional()
  sort?: string;

  @IsOptional()
  sortDir?: SortDirection;

  @IsOptional()
  @IsString()
  @IsUUID()
  serviceId?: string;

  @IsOptional()
  @IsString()
  @IsUUID()
  barberShopId?: string;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  dateFrom?: Date;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  dateTo?: Date;
}
