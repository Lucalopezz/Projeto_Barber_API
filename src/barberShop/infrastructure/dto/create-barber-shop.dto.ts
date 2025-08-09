import { CreateBarberShopUseCase } from '@/barberShop/application/usecases/create-barberShop.usecase';
import { Address } from '@/barberShop/domain/value-objects/address.vo';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateBarberShopDto implements CreateBarberShopUseCase.Input {
  @IsString()
  @IsNotEmpty()
  address: Address;

  @IsString()
  @IsNotEmpty()
  name: string;
}
