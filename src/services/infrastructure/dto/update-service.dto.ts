import { UpdateServicesUseCase } from '@/services/application/usecases/update-services.usecase';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class UpdateServiceDto
  implements Omit<UpdateServicesUseCase.Input, 'id' | 'barberShopOwnerId'>
{
  @IsNotEmpty()
  @IsString()
  @IsOptional()
  name: string;

  @IsNotEmpty()
  @IsNumber()
  @IsOptional()
  price: number;

  @IsNotEmpty()
  @IsString()
  @IsOptional()
  description: string;

  @IsNotEmpty()
  @IsNumber()
  @IsOptional()
  duration: number;
}
