import { ListAppointmentsUseCase } from '@/appointments/application/usecases/list-appointments.usecase';
import { SortDirection } from '@/shared/domain/repositories/searchable.repository';
import { Type } from 'class-transformer';
import { IsOptional, IsString, IsUUID } from 'class-validator';

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
  serviceID?: string;

  @IsOptional()
  @Type(() => Date)
  date?: Date;
}
