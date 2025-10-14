import { BarberShopRepository } from '@/barberShop/domain/repositories/barbershop.repository';
import { ServicesRepository } from '@/services/domain/repositories/services.repository';
import { UseCaseContract } from '@/shared/application/usecases/use-case';
import { NotFoundError } from '@/shared/domain/errors/not-found-error';
import {
  ServicesOutput,
  ServicesOutputMapper,
} from '../dtos/services-output.dto';

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace ListServicesUseCase {
  export type Input = {
    barberShopId: string;
  };
  export type Output = ServicesOutput[];

  export class UseCase implements UseCaseContract<Input, Output> {
    constructor(
      private serviceRepository: ServicesRepository.Repository,
      private barberShopRepository: BarberShopRepository.Repository,
    ) {}
    async execute(input: Input): Promise<Output> {
      const barberShop = await this.barberShopRepository.findById(
        input.barberShopId,
      );
      if (!barberShop) {
        throw new NotFoundError('BarberShop not found');
      }
      const entities = await this.serviceRepository.findAllForBarberShop(
        input.barberShopId,
      );
      return entities.map((entity) => ServicesOutputMapper.toOutput(entity));
    }
  }
}
