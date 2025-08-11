import { CreateBarberShopUseCase } from '@/barberShop/application/usecases/create-barberShop.usecase';
import { AddressValidator } from '@/barberShop/domain/validators/address.validator';
import { IsNotEmpty, IsString, IsUUID, Validate } from 'class-validator';

export class CreateBarberShopDto implements CreateBarberShopUseCase.Input {
  @Validate(AddressValidator)
  @IsNotEmpty()
  address: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsUUID()
  @IsNotEmpty()
  ownerId: string;
}
