import { BarberShopEntity } from '@/barberShop/domain/entities/barber-shop.entity';

export type BarberShopOutput = {
  id: string;
  name: string;
  address: string;
  ownerId: string;
  createdAt: Date;
};

export class BarberShopOutputMapper {
  static toOutput(barberShop: BarberShopEntity): BarberShopOutput {
    const data = barberShop.toJSON();
    return {
      ...data,
      address: data.address.toString(),
    };
  }
}
