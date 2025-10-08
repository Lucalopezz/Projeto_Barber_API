import { ServiceEntity } from '@/services/domain/entities/services.entity';
import { ServicesRepository } from '@/services/domain/repositories/services.repository';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { ServicesModelMapper } from './models/services-model.mapper';
import { NotFoundError } from '@/shared/domain/errors/not-found-error';

export class ServicesPrismaRepository implements ServicesRepository.Repository {
  constructor(private prismaService: PrismaService) {}

  insert(entity: ServiceEntity): Promise<void> {
    throw new Error('Method not implemented.');
  }
  findById(id: string): Promise<ServiceEntity> {
    throw new Error('Method not implemented.');
  }
  findAll(): Promise<ServiceEntity[]> {
    throw new Error('Method not implemented.');
  }
  update(entity: ServiceEntity): Promise<void> {
    throw new Error('Method not implemented.');
  }
  delete(id: string): Promise<void> {
    throw new Error('Method not implemented.');
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
