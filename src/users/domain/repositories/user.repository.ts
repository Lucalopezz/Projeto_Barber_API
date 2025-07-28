/* eslint-disable @typescript-eslint/no-namespace */

import {
  SearchableRepositoryInterface,
  SearchParams,
  SearchResult,
} from '@/shared/domain/repositories/searchable.repository';
import { UserEntity } from '../entities/user.entity';
import { Role } from '../entities/role.enum';

export namespace UserRepository {
  // An proper filter for this repo
  export type Filter = {
    name?: string;
    role?: Role;
  };

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
