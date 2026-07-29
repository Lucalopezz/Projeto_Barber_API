import { ListAppointmentsUseCase } from '@/appointments/application/usecases/list-appointments.usecase';
import { SortDirection } from '@/shared/domain/repositories/searchable.repository';
import { Type } from 'class-transformer';
import { IsDate, IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ListAppointmentsDto
  implements Omit<ListAppointmentsUseCase.Input, 'userId'>
{
  @ApiPropertyOptional({ example: 1, minimum: 1, type: Number })
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ example: 15, minimum: 1, type: Number })
  @IsOptional()
  perPage?: number;

  @ApiPropertyOptional({ example: 'date' })
  @IsOptional()
  sort?: string;

  @ApiPropertyOptional({ enum: ['asc', 'desc'], example: 'asc' })
  @IsOptional()
  sortDir?: SortDirection;

  @ApiPropertyOptional({
    format: 'uuid',
    example: 'a53b9480-a2a7-418f-a2f0-30ed79062d80',
  })
  @IsOptional()
  @IsString()
  @IsUUID()
  serviceId?: string;

  @ApiPropertyOptional({
    format: 'uuid',
    example: 'd59f3d9e-5bb9-4db0-b9dd-6f61cf4e7279',
  })
  @IsOptional()
  @IsString()
  @IsUUID()
  barberShopId?: string;

  @ApiPropertyOptional({
    type: String,
    format: 'date-time',
    example: '2026-08-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  dateFrom?: Date;

  @ApiPropertyOptional({
    type: String,
    format: 'date-time',
    example: '2026-08-31T23:59:59.999Z',
  })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  dateTo?: Date;
}
