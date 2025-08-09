import { BarberShopEntity } from '@/barberShop/domain/entities/barber-shop.entity';
import { Address } from '@/barberShop/domain/value-objects/address.vo';

export type BarberShopOutput = {
  id: string;
  name: string;
  address: Address;
  createdAt: Date;
};

export class BarberShopOutputMapper {
  static toOutput(barberShop: BarberShopEntity): BarberShopOutput {
    return barberShop.toJSON();
  }
}
