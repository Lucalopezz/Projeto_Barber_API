import { UseCaseContract } from '@/shared/application/usecases/use-case';
import { UserOutput, UserOutputMapper } from '../dtos/user-output.dto';
import { UserRepository } from '@/users/domain/repositories/user.repository';

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace GetUserUsecase {
  export type Input = {
    id: string;
  };
  export type Output = UserOutput;

  export class UseCase implements UseCaseContract<Input, Output> {
    constructor(private userRepository: UserRepository.Repository) {}

    async execute(input: Input): Promise<UserOutput> {
      const entity = await this.userRepository.findById(input.id);
      return UserOutputMapper.toOutput(entity);
    }
  }
}
