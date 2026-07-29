import { UserRepository } from '@/users/domain/repositories/user.repository';
import { UserOutput, UserOutputMapper } from '../dtos/user-output.dto';
import { BadRequestError } from '@/shared/application/errors/bad-request-error';
import { UseCaseContract } from '@/shared/application/usecases/use-case';
import { UnauthorizedError } from '@/shared/application/errors/unauthorized-error';
import { NotFoundError } from '@/shared/domain/errors/not-found-error';

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace UpdateUserUseCase {
  export type Input = {
    id: string;
    userId: string;
    name?: string;
  };

  export type Output = UserOutput;

  export class UseCase implements UseCaseContract<Input, Output> {
    constructor(private userRepository: UserRepository.Repository) {}

    async execute(input: Input): Promise<Output> {
      if (!input.name) {
        throw new BadRequestError('Name not provided');
      }
      const entity = await this.userRepository.findById(input.id);
      if (!entity) {
        throw new NotFoundError('User not found');
      }
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
