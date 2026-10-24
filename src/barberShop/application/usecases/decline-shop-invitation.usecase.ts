import { BarberShopStaffRepository } from '@/barberShop/domain/repositories/barber-shop-staff.repository';
import { UseCaseContract } from '@/shared/application/usecases/use-case';
import { NotFoundError } from '@/shared/domain/errors/not-found-error';

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace DeclineShopInvitationUseCase {
  export type Input = { invitationId: string; barberId: string };
  export type Output = void;

  export class UseCase implements UseCaseContract<Input, Output> {
    constructor(private readonly staff: BarberShopStaffRepository.Repository) {}

    async execute({ invitationId, barberId }: Input): Promise<Output> {
      const invitation = await this.staff.findInvitation(invitationId);
      if (!invitation || invitation.invitation.barberId !== barberId) {
        throw new NotFoundError('Invitation not found');
      }
      await this.staff.deleteInvitation(invitationId);
    }
  }
}
