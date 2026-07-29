import { UpdateAppointmentUseCase } from '@/appointments/application/usecases/update-appointment.usecase';
import { IsDate, IsOptional, IsString, IsUUID } from 'class-validator';
import { ToUtcDate } from './utc-date.transform';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateAppointmentDto
  implements Omit<UpdateAppointmentUseCase.Input, 'id' | 'userId'>
{
  @ApiPropertyOptional({
    type: String,
    format: 'date-time',
    example: '2026-08-03T15:00:00.000Z',
  })
  @IsOptional()
  @IsDate()
  @ToUtcDate()
  date: Date;

  @ApiPropertyOptional({
    format: 'uuid',
    example: 'a53b9480-a2a7-418f-a2f0-30ed79062d80',
  })
  @IsString()
  @IsUUID()
  @IsOptional()
  serviceId: string;
}
