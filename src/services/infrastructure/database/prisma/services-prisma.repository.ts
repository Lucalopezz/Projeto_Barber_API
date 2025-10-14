import { ServiceEntity } from '@/services/domain/entities/services.entity';
import { ServicesRepository } from '@/services/domain/repositories/services.repository';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { ServicesModelMapper } from './models/services-model.mapper';
import { NotFoundError } from '@/shared/domain/errors/not-found-error';

export class ServicesPrismaRepository implements ServicesRepository.Repository {
  constructor(private prismaService: PrismaService) {}

  async findAllForBarberShop(barberShopId: string): Promise<ServiceEntity[]> {
    const services = await this.prismaService.service.findMany({
      where: {
        barberShopId,
      },
    });
    return services.map((service) => ServicesModelMapper.toEntity(service));
  }

  async insert(entity: ServiceEntity): Promise<void> {
    await this.prismaService.service.create({
      data: entity.toJSON(),
    });
    return;
  }
  findById(id: string): Promise<ServiceEntity> {
    return this._get(id);
  }
  async findAll(): Promise<ServiceEntity[]> {
    const services = await this.prismaService.service.findMany();
    return services.map((service) => ServicesModelMapper.toEntity(service));
  }
  async update(entity: ServiceEntity): Promise<void> {
    await this._get(entity._id);
    await this.prismaService.service.update({
      data: entity.toJSON(),
      where: {
        id: entity._id,
      },
    });
  }
  async delete(id: string): Promise<void> {
    await this._get(id);
    await this.prismaService.service.delete({
      where: { id },
    });
  }

  protected async _get(id: string): Promise<ServiceEntity> {
    try {
      const service = await this.prismaService.service.findUnique({
        where: {
          id,
        },
      });
      return ServicesModelMapper.toEntity(service);
    } catch {
      throw new NotFoundError(`UserModel not found using ID ${id}`);
    }
  }
}
