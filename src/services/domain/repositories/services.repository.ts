import { ServiceEntity } from '../entities/services.entity';
import { RepositoryInterface } from '@/shared/domain/repositories/repository-contract';

/* eslint-disable @typescript-eslint/no-namespace */
export namespace ServicesRepository {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  export interface Repository extends RepositoryInterface<ServiceEntity> {
    findAllForBarberShop(barberShopId: string): Promise<ServiceEntity[]>;
  }
}
