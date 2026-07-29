import { UpdateServicesUseCase } from '@/services/application/usecases/update-services.usecase';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateServiceDto
  implements Omit<UpdateServicesUseCase.Input, 'id' | 'barberShopOwnerId'>
{
  @ApiPropertyOptional({ example: 'Corte degradê premium' })
  @IsNotEmpty()
  @IsString()
  @IsOptional()
  name: string;

  @ApiPropertyOptional({ example: 60, minimum: 0 })
  @IsNotEmpty()
  @IsNumber()
  @IsOptional()
  price: number;

  @ApiPropertyOptional({ example: 'Corte e acabamento à navalha' })
  @IsNotEmpty()
  @IsString()
  @IsOptional()
  description: string;

  @ApiPropertyOptional({
    description: 'Duração do serviço em minutos.',
    example: 60,
    minimum: 1,
  })
  @IsNotEmpty()
  @IsNumber()
  @IsOptional()
  duration: number;
}
