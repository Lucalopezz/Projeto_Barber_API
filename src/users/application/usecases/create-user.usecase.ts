import { UseCaseContract } from '@/shared/application/usecases/use-case';
import { UserOutput, UserOutputMapper } from '../dtos/user-output.dto';
import { Role } from '@/users/domain/entities/role.enum';
import { BadRequestError } from '@/shared/application/errors/bad-request-error';

import { HashProvider } from '@/shared/application/providers/hash-provider';
import { UserRepository } from '@/users/domain/repositories/user.repository';
import { UserEntity } from '@/users/domain/entities/user.entity';

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace CreateUseCase {
  export type Input = {
    email: string;
    role: Role;
    password: string;
    name: string;
  };
  export type Output = UserOutput;

  export class UseCase implements UseCaseContract<Input, Output> {
    constructor(
      private readonly hashProvider: HashProvider,
      private userRepository: UserRepository.Repository,
    ) {}
    async execute(input: Input): Promise<UserOutput> {
      const { email, password, role, name } = input;

      if (!email || !password || !name || !role) {
        throw new BadRequestError('Input data not provided');
      }
      await this.userRepository.emailExists(email);
      const hashPass = await this.hashProvider.generateHash(password);

      const entity = new UserEntity(
        Object.assign(input, {
          password: hashPass,
        }),
      );
      await this.userRepository.insert(entity);

      return UserOutputMapper.toOutput(entity);
    }
  }
}
