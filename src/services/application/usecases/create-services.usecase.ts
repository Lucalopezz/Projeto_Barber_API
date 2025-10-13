import { ServicesRepository } from '@/services/domain/repositories/services.repository';
import {
  ServicesOutput,
  ServicesOutputMapper,
} from '../dtos/services-output.dto';
import { BarberShopRepository } from '@/barberShop/domain/repositories/barbershop.repository';
import { UseCaseContract } from '@/shared/application/usecases/use-case';
import { BadRequestError } from '@/shared/application/errors/bad-request-error';
import { ServiceEntity } from '@/services/domain/entities/services.entity';

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace CreateServicesUseCase {
  export type Input = {
    name: string;
    price: number;
    description: string;
    duration: number;
    barberShopOwnerId: string;
  };
  export type Output = ServicesOutput;

  export class UseCase implements UseCaseContract<Input, Output> {
    constructor(
      private servicesRepository: ServicesRepository.Repository,
      private barberShopRepository: BarberShopRepository.Repository,
    ) {}
    async execute(input: Input): Promise<ServicesOutput> {
      const { name, description, duration, barberShopOwnerId, price } = input;
      console.log(barberShopOwnerId);

      const barberShop =
        await this.barberShopRepository.findByOwnerId(barberShopOwnerId);

      if (!barberShop) {
        throw new BadRequestError('BarberShop not found');
      }

      const entity = new ServiceEntity({
        name,
        price,
        description,
        duration,
        barberShopId: barberShop.id,
      });
      await this.servicesRepository.insert(entity);

      return ServicesOutputMapper.toOutput(entity);
    }
  }
}
