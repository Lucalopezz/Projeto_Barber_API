import { UpdateAppointmentUseCase } from '@/appointments/application/usecases/update-appointment.usecase';
import { Type } from 'class-transformer';
import { IsOptional, IsString, IsUUID } from 'class-validator';

export class UpdateAppointmentDto
  implements Omit<UpdateAppointmentUseCase.Input, 'id' | 'userId'>
{
  @IsOptional()
  @Type(() => Date)
  date: Date;

  @IsString()
  @IsUUID()
  @IsOptional()
  serviceId: string;
}
