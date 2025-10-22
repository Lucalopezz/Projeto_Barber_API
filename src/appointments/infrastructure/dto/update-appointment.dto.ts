import { UpdateStatusUseCase } from '@/appointments/application/usecases/update-status.usecase';
import { AppointmentStatus } from '@/appointments/domain/entities/appointmentStatus.enum';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';

export class UpdateAppointmentDto
  implements Omit<UpdateStatusUseCase.Input, 'id' | 'barberId'>
{
  @IsString()
  @IsNotEmpty()
  @IsEnum(AppointmentStatus)
  newStatus: AppointmentStatus;
}
