import { IsNotEmpty, IsOptional, IsString, Validate } from 'class-validator';
import { AddressValidator } from '@/barberShop/domain/validators/address.validator';
import { UpdateBarberShopUseCase } from '@/barberShop/application/usecases/update-barberShop.usecase';
import { Address } from '@/barberShop/domain/value-objects/address.vo';

export class UpdateBarberShopDto
  implements Omit<UpdateBarberShopUseCase.Input, 'id' | 'ownerId'>
{
  @IsOptional()
  @Validate(AddressValidator)
  @IsNotEmpty()
  address?: Address;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  name?: string;
}
