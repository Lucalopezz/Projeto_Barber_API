import { BarberShopRepository } from '@/barberShop/domain/repositories/barbershop.repository';
import { BadRequestError } from '@/shared/application/errors/bad-request-error';
import { UseCaseContract } from '@/shared/application/usecases/use-case';
import { UserRepository } from '@/users/domain/repositories/user.repository';

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace DeleteBarberShopUseCase {
  export type Input = {
    id: string;
    ownerId: string;
  };

  export type Output = void;

  export class UseCase implements UseCaseContract<Input, Output> {
    constructor(
      private barberShopRepository: BarberShopRepository.Repository,
      private userRepo: UserRepository.Repository,
    ) {}

    async execute(input: Input): Promise<Output> {
      const { id, ownerId } = input;

      if (!id || !ownerId) {
        throw new BadRequestError('Input data not provided');
      }
      const [owner, hasBarberShop] = await Promise.all([
        this.userRepo.findById(ownerId),
        this.barberShopRepository.findByOwnerId(ownerId),
      ]);

      if (!owner && !hasBarberShop) {
        throw new BadRequestError('Owner or BarberShop not found');
      }

      await this.barberShopRepository.delete(input.id);
    }
  }
}
