import { IsNotEmpty, IsString, IsUUID, Validate } from 'class-validator';
import { AddressValidator } from '@/barberShop/domain/validators/address.validator';
import { UpdateBarberShopUseCase } from '@/barberShop/application/usecases/update-barberShop.usecase';
import { Address } from '@/barberShop/domain/value-objects/address.vo';

export class UpdateBarberShopDto
  implements Omit<UpdateBarberShopUseCase.Input, 'id'>
{
  @Validate(AddressValidator)
  @IsNotEmpty()
  address: Address;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsUUID()
  @IsNotEmpty()
  ownerId: string;
}
