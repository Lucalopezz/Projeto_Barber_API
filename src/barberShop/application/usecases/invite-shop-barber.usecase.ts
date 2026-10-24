import { BarberShopRepository } from '@/barberShop/domain/repositories/barbershop.repository';
import { BarberShopStaffRepository } from '@/barberShop/domain/repositories/barber-shop-staff.repository';
import {
  ShopInvitationOutput,
  ShopStaffOutputMapper,
} from '../dtos/shop-staff-output.dto';
import { UseCaseContract } from '@/shared/application/usecases/use-case';
import { UserRepository } from '@/users/domain/repositories/user.repository';
import { Role } from '@/users/domain/entities/role.enum';
import { ConflictError } from '@/shared/domain/errors/conflict-error';
import { NotFoundError } from '@/shared/domain/errors/not-found-error';
import { requireShopOwner } from './shop-staff-authorization';

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace InviteShopBarberUseCase {
  export type Input = { shopId: string; ownerId: string; email: string };
  export type Output = ShopInvitationOutput;

  export class UseCase implements UseCaseContract<Input, Output> {
    constructor(
      private readonly shops: BarberShopRepository.Repository,
      private readonly users: UserRepository.Repository,
      private readonly staff: BarberShopStaffRepository.Repository,
    ) {}

    async execute({ shopId, ownerId, email }: Input): Promise<Output> {
      await requireShopOwner(this.shops, shopId, ownerId);
      const user = await this.users.findByEmail(email.trim());
      if (!user) throw new NotFoundError('Barber account not found');
      if (user.role !== Role.barber || user.barberShopId) {
        throw new ConflictError('Barber already belongs to a shop');
      }
      const invitation = await this.staff.createInvitation(shopId, user.id);
      return ShopStaffOutputMapper.invitationToOutput(invitation);
    }
  }
}
