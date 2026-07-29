import { GetPublicAvailabilityUseCase } from '@/appointments/application/usecases/get-public-availability.usecase';
import { IsDateString, IsUUID } from 'class-validator';

export class GetPublicAvailabilityDto
  implements Omit<GetPublicAvailabilityUseCase.Input, 'barberShopId'>
{
  @IsDateString({ strict: true })
  date: string;

  @IsUUID()
  serviceId: string;
}
