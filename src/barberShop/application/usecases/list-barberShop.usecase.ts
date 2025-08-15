import {
  PaginationOutput,
  PaginationOutputMapper,
} from '@/shared/application/dtos/pagination-output';
import {
  BarberShopOutput,
  BarberShopOutputMapper,
} from '../dtos/barberShop-output.dto';
import { UseCaseContract } from '@/shared/application/usecases/use-case';
import { BarberShopRepository } from '@/barberShop/domain/repositories/barbershop.repository';

/* eslint-disable @typescript-eslint/no-namespace */
export namespace ListBarberShopUseCase {
  export type Input = {
    page?: number;
    perPage?: number;
    sort?: string;
    sortDir?: 'asc' | 'desc';
    filter?: string;
  };
  export type Output = PaginationOutput<BarberShopOutput>;

  export class UseCase implements UseCaseContract<Input, Output> {
    constructor(
      private barberShopRepository: BarberShopRepository.Repository,
    ) {}

    async execute(input: Input): Promise<Output> {
      const params = new BarberShopRepository.BarberShopSearchParams(input);
      const searchResult = await this.barberShopRepository.search(params);

      return this.toOutput(searchResult);
    }

    private toOutput(
      searchResult: BarberShopRepository.BarberShopSearchResult,
    ): Output {
      const items = searchResult.items.map((barberShop) => {
        return BarberShopOutputMapper.toOutput(barberShop);
      });
      return PaginationOutputMapper.toOutput<BarberShopOutput>(
        items,
        searchResult,
      );
    }
  }
}
