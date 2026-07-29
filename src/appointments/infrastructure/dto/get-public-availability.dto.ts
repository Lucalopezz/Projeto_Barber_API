import { GetPublicAvailabilityUseCase } from '@/barberShop/application/usecases/get-public-availability.usecase';
import { IsDateString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GetPublicAvailabilityDto
  implements Omit<GetPublicAvailabilityUseCase.Input, 'barberShopId'>
{
  @ApiProperty({
    format: 'date',
    example: '2026-08-03',
    description: 'Data local no fuso da barbearia (YYYY-MM-DD).',
  })
  @IsDateString({ strict: true })
  date: string;

  @ApiProperty({
    format: 'uuid',
    example: 'a53b9480-a2a7-418f-a2f0-30ed79062d80',
  })
  @IsUUID()
  serviceId: string;
}
