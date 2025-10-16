import { BarberShopRepository } from '@/barberShop/domain/repositories/barbershop.repository';
import { ServicesRepository } from '@/services/domain/repositories/services.repository';
import { BadRequestError } from '@/shared/application/errors/bad-request-error';
import { UseCaseContract } from '@/shared/application/usecases/use-case';

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace DeleteServicesUseCase {
  export type Input = {
    id: string;
    barberShopOwnerId: string;
  };
  export type Output = void;

  export class UseCase implements UseCaseContract<Input, Output> {
    constructor(
      private servicesRepositoty: ServicesRepository.Repository,
      private barberShopRepository: BarberShopRepository.Repository,
    ) {}
    async execute(input: Input): Promise<void> {
      const { id, barberShopOwnerId } = input;
      if (!id || !barberShopOwnerId) {
        throw new BadRequestError('Input data not provided');
      }

      const barberShop =
        await this.barberShopRepository.findByOwnerId(barberShopOwnerId);
      if (!barberShop) {
        throw new BadRequestError('BarberShop not found for the given owner');
      }
      const service = await this.servicesRepositoty.findById(id);
      if (!service || service.barberShopId !== barberShop.id) {
        throw new BadRequestError(
          'Service not found for the given barber shop',
        );
      }
      await this.servicesRepositoty.delete(id);
    }
  }
}
