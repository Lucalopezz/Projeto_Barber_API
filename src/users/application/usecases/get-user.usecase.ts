import { UseCaseContract } from '@/shared/application/usecases/use-case';
import { UserRepository } from '@/users/domain/repositories/user.repository';
import { BarberShopRepository } from '@/barberShop/domain/repositories/barbershop.repository';
import { Role } from '@/users/domain/entities/role.enum';
import {
  BarberShopRelationship,
  UserContextOutput,
  UserContextOutputMapper,
} from '../dtos/user-context-output.dto';

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace GetUserUseCase {
  export type Input = {
    id: string;
  };
  export type Output = UserContextOutput;

  export class UseCase implements UseCaseContract<Input, Output> {
    constructor(
      private userRepository: UserRepository.Repository,
      private barberShopRepository: BarberShopRepository.Repository,
    ) {}

    async execute(input: Input): Promise<Output> {
      const user = await this.userRepository.findById(input.id);
      let barberShop = null;
      let relationship: BarberShopRelationship | null = null;

      if (user.role === Role.owner) {
        barberShop = await this.barberShopRepository.findByOwnerId(user.id);
        relationship = barberShop ? 'owner' : null;
      } else if (user.role === Role.barber && user.barberShopId) {
        barberShop = await this.barberShopRepository.findById(
          user.barberShopId,
        );
        relationship = 'barber';
      }

      return UserContextOutputMapper.toOutput(user, barberShop, relationship);
    }
  }
}
