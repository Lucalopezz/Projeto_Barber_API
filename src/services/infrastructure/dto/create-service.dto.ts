import { CreateServicesUseCase } from '@/services/application/usecases/create-services.usecase';
import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class CreateServiceDto
  implements Omit<CreateServicesUseCase.Input, 'barberShopOwnerId'>
{
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsNumber()
  price: number;

  @IsNotEmpty()
  @IsString()
  description: string;

  @IsNotEmpty()
  @IsNumber()
  duration: number;
}
