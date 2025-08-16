import { UseCaseContract } from '@/shared/application/usecases/use-case';
import {
  BarberShopOutput,
  BarberShopOutputMapper,
} from '../dtos/barberShop-output.dto';
import { BarberShopRepository } from '@/barberShop/domain/repositories/barbershop.repository';

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace GetBarberShopUseCase {
  export type Input = {
    id: string;
  };
  export type Output = BarberShopOutput;

  export class UseCase implements UseCaseContract<Input, Output> {
    constructor(
      private barberShopRepository: BarberShopRepository.Repository,
    ) {}

    async execute(input: Input): Promise<BarberShopOutput> {
      const entity = await this.barberShopRepository.findById(input.id);
      return BarberShopOutputMapper.toOutput(entity);
    }
  }
}
