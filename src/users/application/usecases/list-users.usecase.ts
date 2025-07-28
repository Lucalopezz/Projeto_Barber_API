import {
  PaginationOutput,
  PaginationOutputMapper,
} from '@/shared/application/dtos/pagination-output';
import { UserOutput, UserOutputMapper } from '../dtos/user-output.dto';
import { UseCaseContract } from '@/shared/application/usecases/use-case';
import { UserRepository } from '@/users/domain/repositories/user.repository';
import { Role } from '@/users/domain/entities/role.enum';

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace ListUsersUseCase {
  export type Input = {
    page?: number;
    perPage?: number;
    sort?: string;
    sortDir?: 'asc' | 'desc';
    //Separed filter in 2 camps for a batter search
    name?: string;
    role?: Role;
  };
  export type Output = PaginationOutput<UserOutput>;

  export class UseCase implements UseCaseContract<Input, Output> {
    constructor(private userRepository: UserRepository.Repository) {}

    async execute(input: Input): Promise<Output> {
      const filter: UserRepository.Filter = {};
      if (input.name) {
        filter.name = input.name;
      }
      if (input.role) {
        filter.role = input.role;
      }

      // send an object as filter
      const params = new UserRepository.UserSearchParams({
        page: input.page,
        perPage: input.perPage,
        sort: input.sort,
        sortDir: input.sortDir,
        filter,
      });

      const searchResult = await this.userRepository.search(params);

      return this.toOutput(searchResult);
    }

    private toOutput(searchResult: UserRepository.UserSearchResult): Output {
      const items = searchResult.items.map((user) => {
        return UserOutputMapper.toOutput(user);
      });
      return PaginationOutputMapper.toOutput<UserOutput>(items, searchResult);
    }
  }
}
