import { BadRequestError } from '@/shared/application/errors/bad-request-error';
import { UseCaseContract } from '@/shared/application/usecases/use-case';
import {
  BarberShopOutput,
  BarberShopOutputMapper,
} from '../dtos/barberShop-output.dto';
import { BarberShopRepository } from '@/barberShop/domain/repositories/barbershop.repository';
import { Address } from '@/barberShop/domain/value-objects/address.vo';

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace UpdateBarberShopUseCase {
  export type Input = {
    id: string;
    name?: string;
    address?: Address;
    ownerId: string;
  };

  export type Output = BarberShopOutput;

  export class UseCase implements UseCaseContract<Input, Output> {
    constructor(
      private barberShopRepository: BarberShopRepository.Repository,
    ) {}

    async execute(input: Input): Promise<Output> {
      if (!input.name && !input.address) {
        throw new BadRequestError('Name and Address not provided');
      }
      const barberShop = await this.barberShopRepository.findByOwnerId(
        input.ownerId,
      );
      if (!barberShop || barberShop.id !== input.id) {
        throw new BadRequestError('Barber shop not found for the given owner');
      }

      barberShop.update(input.name, input.address);
      await this.barberShopRepository.update(barberShop);

      return BarberShopOutputMapper.toOutput(barberShop);
    }
  }
}
