import { UpdateAppointmentUseCase } from '@/appointments/application/usecases/update-appointment.usecase';
import { IsDate, IsOptional, IsString, IsUUID } from 'class-validator';
import { ToUtcDate } from './utc-date.transform';

export class UpdateAppointmentDto
  implements Omit<UpdateAppointmentUseCase.Input, 'id' | 'userId'>
{
  @IsOptional()
  @IsDate()
  @ToUtcDate()
  date: Date;

  @IsString()
  @IsUUID()
  @IsOptional()
  serviceId: string;
}
