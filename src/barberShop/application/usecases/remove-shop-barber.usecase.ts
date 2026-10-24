import { BarberShopRepository } from '@/barberShop/domain/repositories/barbershop.repository';
import { BarberShopStaffRepository } from '@/barberShop/domain/repositories/barber-shop-staff.repository';
import { UseCaseContract } from '@/shared/application/usecases/use-case';
import { BadRequestError } from '@/shared/application/errors/bad-request-error';
import { ConflictError } from '@/shared/domain/errors/conflict-error';
import { NotFoundError } from '@/shared/domain/errors/not-found-error';
import { requireShopOwner } from './shop-staff-authorization';

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace RemoveShopBarberUseCase {
  export type Input = { shopId: string; ownerId: string; barberId: string };
  export type Output = void;

  export class UseCase implements UseCaseContract<Input, Output> {
    constructor(
      private readonly shops: BarberShopRepository.Repository,
      private readonly staff: BarberShopStaffRepository.Repository,
    ) {}

    async execute({ shopId, ownerId, barberId }: Input): Promise<Output> {
      await requireShopOwner(this.shops, shopId, ownerId);
      if (ownerId === barberId)
        throw new BadRequestError('Owner cannot leave their shop');
      const outcome = await this.staff.removeBarber(shopId, barberId);
      if (outcome === 'booked')
        throw new ConflictError('Barber has upcoming appointments');
      if (outcome === 'missing')
        throw new NotFoundError('Barber not found in shop');
    }
  }
}
