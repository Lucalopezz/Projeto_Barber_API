import { UserRepository } from '@/users/domain/repositories/user.repository';
import { UserOutput, UserOutputMapper } from '../dtos/user-output.dto';
import { BadRequestError } from '@/shared/application/errors/bad-request-error';
import { UseCaseContract } from '@/shared/application/usecases/use-case';
import { Role } from '@/users/domain/entities/role.enum';
import { UnauthorizedError } from '@/shared/application/errors/unauthorized-error';

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace UpdateUserUseCase {
  export type Input = {
    id: string;
    userId: string;
    role?: Role;
    name?: string;
  };

  export type Output = UserOutput;

  export class UseCase implements UseCaseContract<Input, Output> {
    constructor(private userRepository: UserRepository.Repository) {}

    async execute(input: Input): Promise<Output> {
      if (!input.name && !input.role) {
        throw new BadRequestError('Name and Role not provided');
      }
      const entity = await this.userRepository.findById(input.id);
      if (entity.id !== input.userId) {
        throw new UnauthorizedError(
          "You don't have permission to update this user",
        );
      }
      entity.update(input.name);
      await this.userRepository.update(entity);
      return UserOutputMapper.toOutput(entity);
    }
  }
}
