import { CreateServicesUseCase } from '@/services/application/usecases/create-services.usecase';
import { IsNotEmpty, IsNumber, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateServiceDto
  implements Omit<CreateServicesUseCase.Input, 'barberShopOwnerId'>
{
  @ApiProperty({ example: 'Corte degradê' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ example: 55, minimum: 0 })
  @IsNotEmpty()
  @IsNumber()
  price: number;

  @ApiProperty({ example: 'Corte com acabamento à navalha' })
  @IsNotEmpty()
  @IsString()
  description: string;

  @ApiProperty({
    description: 'Duração do serviço em minutos.',
    example: 45,
    minimum: 1,
  })
  @IsNotEmpty()
  @IsNumber()
  duration: number;
}
