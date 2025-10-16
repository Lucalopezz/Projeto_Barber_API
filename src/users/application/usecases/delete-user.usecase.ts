import { UnauthorizedError } from '@/shared/application/errors/unauthorized-error';
import { UseCaseContract } from '@/shared/application/usecases/use-case';
import { UserRepository } from '@/users/domain/repositories/user.repository';

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace DeleteUserUseCase {
  export type Input = {
    id: string;
    userId: string;
  };

  export type Output = void;

  export class UseCase implements UseCaseContract<Input, Output> {
    constructor(private userRepository: UserRepository.Repository) {}

    async execute(input: Input): Promise<Output> {
      const entity = await this.userRepository.findById(input.id);
      if (entity.id !== input.userId) {
        throw new UnauthorizedError(
          "You don't have permission to delete this user",
        );
      }
      await this.userRepository.delete(input.id);
    }
  }
}
