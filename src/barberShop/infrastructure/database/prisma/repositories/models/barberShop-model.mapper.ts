import { BarberShopEntity } from '@/barberShop/domain/entities/barber-shop.entity';
import { Address } from '@/barberShop/domain/value-objects/address.vo';
import { ValidationError } from '@/shared/domain/errors/validation-error';
import { BarberShop } from '@prisma/client';

export class BarberShopModelMapper {
  static toEntity(model: BarberShop) {
    const data = {
      name: model.name,
      address: new Address(model.address),
      ownerId: model.ownerId,
      createdAt: model.createdAt,
    };
    try {
      return new BarberShopEntity(data, model.id);
    } catch {
      throw new ValidationError('An entity not be loaded');
    }
  }
}
