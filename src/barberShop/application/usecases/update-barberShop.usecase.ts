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
  };

  export type Output = BarberShopOutput;

  export class UseCase implements UseCaseContract<Input, Output> {
    constructor(
      private barberShopRepository: BarberShopRepository.Repository,
    ) {}

    async execute(input: Input): Promise<Output> {
      if (!input.name && !input.address) {
        throw new BadRequestError('Name and Adress not provided');
      }
      const entity = await this.barberShopRepository.findById(input.id);

      entity.update(input.name, input.address);
      await this.barberShopRepository.update(entity);
      return BarberShopOutputMapper.toOutput(entity);
    }
  }
}
