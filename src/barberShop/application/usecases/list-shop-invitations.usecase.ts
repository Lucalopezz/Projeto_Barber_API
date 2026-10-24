import { BarberShopRepository } from '@/barberShop/domain/repositories/barbershop.repository';
import { BarberShopStaffRepository } from '@/barberShop/domain/repositories/barber-shop-staff.repository';
import {
  ShopInvitationOutput,
  ShopStaffOutputMapper,
} from '../dtos/shop-staff-output.dto';
import { UseCaseContract } from '@/shared/application/usecases/use-case';
import { requireShopOwner } from './shop-staff-authorization';

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace ListShopInvitationsUseCase {
  export type Input = { shopId: string; ownerId: string };
  export type Output = ShopInvitationOutput[];

  export class UseCase implements UseCaseContract<Input, Output> {
    constructor(
      private readonly shops: BarberShopRepository.Repository,
      private readonly staff: BarberShopStaffRepository.Repository,
    ) {}

    async execute({ shopId, ownerId }: Input): Promise<Output> {
      await requireShopOwner(this.shops, shopId, ownerId);
      const invitations = await this.staff.listShopInvitations(shopId);
      return invitations.map(ShopStaffOutputMapper.invitationToOutput);
    }
  }
}
