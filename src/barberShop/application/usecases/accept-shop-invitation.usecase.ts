import { BarberShopStaffRepository } from '@/barberShop/domain/repositories/barber-shop-staff.repository';
import { ShopBarberOutput } from '../dtos/shop-staff-output.dto';
import { UseCaseContract } from '@/shared/application/usecases/use-case';
import { ConflictError } from '@/shared/domain/errors/conflict-error';
import { NotFoundError } from '@/shared/domain/errors/not-found-error';

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace AcceptShopInvitationUseCase {
  export type Input = { invitationId: string; barberId: string };
  export type Output = ShopBarberOutput & { barberShopId: string };

  export class UseCase implements UseCaseContract<Input, Output> {
    constructor(private readonly staff: BarberShopStaffRepository.Repository) {}

    async execute({ invitationId, barberId }: Input): Promise<Output> {
      const invitation = await this.staff.findInvitation(invitationId);
      if (!invitation || invitation.invitation.barberId !== barberId) {
        throw new NotFoundError('Invitation not found');
      }
      const accepted = await this.staff.acceptInvitation(
        invitationId,
        barberId,
        invitation.invitation.barberShopId,
      );
      if (!accepted)
        throw new ConflictError('Barber already belongs to a shop');
      return {
        id: barberId,
        name: invitation.barber.name,
        role: 'barber',
        barberShopId: invitation.invitation.barberShopId,
      };
    }
  }
}
