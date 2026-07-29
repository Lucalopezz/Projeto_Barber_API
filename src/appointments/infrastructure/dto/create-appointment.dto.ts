import { CreateAppointmentsUseCase } from '@/appointments/application/usecases/create-appointment.usecase';
import { IsDate, IsNotEmpty, IsString, IsUUID } from 'class-validator';
import { ToUtcDate } from './utc-date.transform';
import { ApiProperty } from '@nestjs/swagger';
export class CreateAppointmentDto
  implements Omit<CreateAppointmentsUseCase.Input, 'clientId'>
{
  @ApiProperty({
    format: 'uuid',
    example: 'a53b9480-a2a7-418f-a2f0-30ed79062d80',
  })
  @IsString()
  @IsUUID()
  @IsNotEmpty()
  serviceId: string;

  @ApiProperty({
    type: String,
    format: 'date-time',
    example: '2026-08-03T14:00:00.000Z',
  })
  @IsNotEmpty()
  @IsDate()
  @ToUtcDate()
  date: Date;
}
