/* eslint-disable @typescript-eslint/no-namespace */

import {
  SearchableRepositoryInterface,
  SearchParams,
  SearchResult,
} from '@/shared/domain/repositories/searchable.repository';
import { UserEntity } from '../entities/user.entity';

export namespace UserRepository {
  export type Filter = string;

  export class UserSearchParams extends SearchParams<Filter> {}

  export class UserSearchResult extends SearchResult<UserEntity, Filter> {}

  export interface Repository
    extends SearchableRepositoryInterface<
      UserEntity,
      Filter,
      UserSearchParams,
      UserSearchResult
    > {
    findByEmail(email: string): Promise<UserEntity>;
    emailExists(email: string): Promise<void>;
  }
}
