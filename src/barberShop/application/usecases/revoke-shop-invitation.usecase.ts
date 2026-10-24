import { BarberShopRepository } from '@/barberShop/domain/repositories/barbershop.repository';
import { BarberShopStaffRepository } from '@/barberShop/domain/repositories/barber-shop-staff.repository';
import { UseCaseContract } from '@/shared/application/usecases/use-case';
import { NotFoundError } from '@/shared/domain/errors/not-found-error';
import { requireShopOwner } from './shop-staff-authorization';

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace RevokeShopInvitationUseCase {
  export type Input = { shopId: string; ownerId: string; invitationId: string };
  export type Output = void;

  export class UseCase implements UseCaseContract<Input, Output> {
    constructor(
      private readonly shops: BarberShopRepository.Repository,
      private readonly staff: BarberShopStaffRepository.Repository,
    ) {}

    async execute({ shopId, ownerId, invitationId }: Input): Promise<Output> {
      await requireShopOwner(this.shops, shopId, ownerId);
      const invitation = await this.staff.findInvitation(invitationId);
      if (!invitation || invitation.invitation.barberShopId !== shopId) {
        throw new NotFoundError('Invitation not found');
      }
      await this.staff.deleteInvitation(invitationId);
    }
  }
}
