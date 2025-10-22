import { CreateAppointmentsUseCase } from '@/appointments/application/usecases/create-appointment.usecase';
import { Type } from 'class-transformer';

import { IsNotEmpty, IsString, IsUUID } from 'class-validator';
export class CreateAppointmentDto
  implements Omit<CreateAppointmentsUseCase.Input, 'clientId'>
{
  @IsString()
  @IsUUID()
  @IsNotEmpty()
  serviceId: string;

  @IsNotEmpty()
  @Type(() => Date)
  date: Date;
}
