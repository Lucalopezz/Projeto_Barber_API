import { UseCaseContract } from '@/shared/application/usecases/use-case';
import { UserRepository } from '@/users/domain/repositories/user.repository';

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace DeleteUserUseCase {
  export type Input = {
    id: string;
  };

  export type Output = void;

  export class UseCase implements UseCaseContract<Input, Output> {
    constructor(private userRepository: UserRepository.Repository) {}

    async execute(input: Input): Promise<Output> {
      await this.userRepository.delete(input.id);
    }
  }
}
