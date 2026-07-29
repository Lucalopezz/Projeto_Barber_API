import { UpdateStatusUseCase } from '@/appointments/application/usecases/update-status.usecase';
import { AppointmentStatus } from '@/appointments/domain/entities/appointmentStatus.enum';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateStatusDto
  implements Omit<UpdateStatusUseCase.Input, 'id' | 'userId'>
{
  @ApiProperty({
    enum: [AppointmentStatus.completed, AppointmentStatus.cancelled],
    example: AppointmentStatus.cancelled,
  })
  @IsString()
  @IsNotEmpty()
  @IsEnum(AppointmentStatus)
  newStatus: AppointmentStatus;
}
