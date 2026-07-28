import { CreateAppointmentsUseCase } from '@/appointments/application/usecases/create-appointment.usecase';
import { IsDate, IsNotEmpty, IsString, IsUUID } from 'class-validator';
import { ToUtcDate } from './utc-date.transform';
export class CreateAppointmentDto
  implements Omit<CreateAppointmentsUseCase.Input, 'clientId'>
{
  @IsString()
  @IsUUID()
  @IsNotEmpty()
  serviceId: string;

  @IsNotEmpty()
  @IsDate()
  @ToUtcDate()
  date: Date;
}
