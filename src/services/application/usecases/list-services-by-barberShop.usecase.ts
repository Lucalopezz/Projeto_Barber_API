import {
  PaginationOutput,
  PaginationOutputMapper,
} from '@/shared/application/dtos/pagination-output';
import { ServicesRepository } from '@/services/domain/repositories/services.repository';
import { UseCaseContract } from '@/shared/application/usecases/use-case';
import {
  ServicesOutput,
  ServicesOutputMapper,
} from '../dtos/services-output.dto';

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace ListServicesByBarberShopUseCase {
  export type Input = {
    page?: number;
    perPage?: number;
    sort?: string;
    sortDir?: 'asc' | 'desc';
    barberShopId: string;
  };
  export type Output = PaginationOutput<ServicesOutput>;

  export class UseCase implements UseCaseContract<Input, Output> {
    constructor(private servicesRepository: ServicesRepository.Repository) {}

    async execute(input: Input): Promise<Output> {
      const filter: ServicesRepository.Filter = {};
      if (input.barberShopId) {
        filter.barberShopId = input.barberShopId;
      }

      const params = new ServicesRepository.ServicesSearchParams({
        page: input.page,
        perPage: input.perPage,
        sort: input.sort,
        sortDir: input.sortDir,
        filter,
      });

      const searchResult = await this.servicesRepository.search(params);
      const items = searchResult.items.map((entity) =>
        ServicesOutputMapper.toOutput(entity),
      );

      return PaginationOutputMapper.toOutput<ServicesOutput>(
        items,
        searchResult,
      );
    }
  }
}
