import { UseCaseContract } from '@/shared/application/usecases/use-case';
import { UserOutput } from '../dtos/user-output.dto';
import { Role } from '@/users/domain/entities/role.enum';
import { BadRequestError } from '@/shared/application/errors/bad-request-error';

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
    execute(input: Input): Promise<UserOutput> {
      const { email, password, role, name } = input;

      if (!email || !password || !name || !role) {
        throw new BadRequestError('Input data not provided');
      }
    }
    // Create user logic
  }
}
