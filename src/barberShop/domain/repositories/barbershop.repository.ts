/* eslint-disable @typescript-eslint/no-namespace */

import {
  SearchableRepositoryInterface,
  SearchParams,
  SearchResult,
} from '@/shared/domain/repositories/searchable.repository';
import { BarberShopEntity } from '../entities/barber-shop.entity';

export namespace BarberShopRepository {
  export type Filter = string;

  export class BarberShopSearchParams extends SearchParams<Filter> {}

  export class BarberShopSearchResult extends SearchResult<
    BarberShopEntity,
    Filter
  > {}

  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  export interface Repository
    extends SearchableRepositoryInterface<
      BarberShopEntity,
      Filter,
      BarberShopSearchParams,
      BarberShopSearchResult
    > {
    findByOwnerId(ownerId: string): Promise<BarberShopEntity>;
  }
}
