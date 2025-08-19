import { HashProvider } from '@/shared/application/providers/hash-provider';
import { BadRequestError } from '@/shared/application/errors/bad-request-error';
import { UserRepository } from '@/users/domain/repositories/user.repository';
import { UserOutput, UserOutputMapper } from '../dtos/user-output.dto';
import { UseCaseContract } from '@/shared/application/usecases/use-case';
import { InvalidCredentialError } from '@/shared/application/errors/invalid-credentials-error';

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace SigninUseCase {
  export type Input = {
    email: string;
    password: string;
  };
  export type Output = UserOutput;

  export class UseCase implements UseCaseContract<Input, Output> {
    constructor(
      private userRepository: UserRepository.Repository,
      private hashProvider: HashProvider,
    ) {}

    async execute(input: Input): Promise<Output> {
      const { email, password } = input;

      if (!email || !password) {
        throw new BadRequestError('Input data not provided');
      }

      const user = await this.userRepository.findByEmail(email);
      const hashPasswordMatch = await this.hashProvider.compareHash(
        password,
        user.password,
      );
      if (!hashPasswordMatch) {
        throw new InvalidCredentialError('Invalid credentials');
      }

      return UserOutputMapper.toOutput(user);
    }
  }
}
