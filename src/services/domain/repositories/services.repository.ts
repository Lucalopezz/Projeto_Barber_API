import { ServiceEntity } from '../entities/services.entity';
import {
  SearchableRepositoryInterface,
  SearchParams,
  SearchResult,
} from '@/shared/domain/repositories/searchable.repository';

/* eslint-disable @typescript-eslint/no-namespace */
export namespace ServicesRepository {
  export type Filter = {
    barberShopId?: string;
  };

  export class ServicesSearchParams extends SearchParams<Filter> {}

  export class ServicesSearchResult extends SearchResult<
    ServiceEntity,
    Filter
  > {}

  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  export interface Repository
    extends SearchableRepositoryInterface<
      ServiceEntity,
      Filter,
      ServicesSearchParams,
      ServicesSearchResult
    > {}
}
