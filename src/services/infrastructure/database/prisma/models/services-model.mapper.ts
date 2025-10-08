import { ServiceEntity } from '@/services/domain/entities/services.entity';
import { ValidationError } from '@/shared/domain/errors/validation-error';
import { Service } from '@prisma/client';

export class ServicesModelMapper {
  static toEntity(model: Service) {
    const data = {
      name: model.name,
      price: parseFloat(model.price.toString()),
      duration: model.duration,
      description: model.description,
      barberShopId: model.barberShopId,
      createdAt: model.createdAt,
    };
    try {
      return new ServiceEntity(data, model.id);
    } catch {
      throw new ValidationError('An entity not be loaded');
    }
  }
}
