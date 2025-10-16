import { UseCaseContract } from '@/shared/application/usecases/use-case';
import {
  ServicesOutput,
  ServicesOutputMapper,
} from '../dtos/services-output.dto';
import { ServicesRepository } from '@/services/domain/repositories/services.repository';
import { BarberShopRepository } from '@/barberShop/domain/repositories/barbershop.repository';
import { NotFoundError } from '@/shared/domain/errors/not-found-error';
import { BadRequestError } from '@/shared/application/errors/bad-request-error';

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace UpdateServicesUseCase {
  export type Input = {
    id: string;
    name?: string;
    price?: number;
    description?: string;
    duration?: number;
    barberShopOwnerId: string;
  };

  export type Output = ServicesOutput;

  export class UseCase implements UseCaseContract<Input, Output> {
    constructor(
      private servicesRepository: ServicesRepository.Repository,
      private barberShopRepository: BarberShopRepository.Repository,
    ) {}
    async execute(input: Input): Promise<ServicesOutput> {
      const { id, name, price, description, duration, barberShopOwnerId } =
        input;

      const barberShop =
        await this.barberShopRepository.findByOwnerId(barberShopOwnerId);
      if (!barberShop) {
        throw new NotFoundError('BarberShop not found');
      }
      const service = await this.servicesRepository.findById(id);
      if (!service || service.barberShopId !== barberShop.id) {
        throw new BadRequestError(
          'Service not found for the given barber shop',
        );
      }
      service.update(name, price, description, duration);
      await this.servicesRepository.update(service);
      return ServicesOutputMapper.toOutput(service);
    }
  }
}
