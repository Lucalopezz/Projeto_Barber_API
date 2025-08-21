import { CreateBarberShopUseCase } from '@/barberShop/application/usecases/create-barberShop.usecase';
import { AddressValidator } from '@/barberShop/domain/validators/address.validator';
import { Address } from '@/barberShop/domain/value-objects/address.vo';
import { IsNotEmpty, IsString, Validate } from 'class-validator';

export class CreateBarberShopDto
  implements Omit<CreateBarberShopUseCase.Input, 'ownerId'>
{
  @Validate(AddressValidator)
  @IsNotEmpty()
  address: Address;

  @IsString()
  @IsNotEmpty()
  name: string;
}
