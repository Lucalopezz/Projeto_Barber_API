import { BarberShopStaffRepository } from '@/barberShop/domain/repositories/barber-shop-staff.repository';
import {
  ShopInvitationOutput,
  ShopStaffOutputMapper,
} from '../dtos/shop-staff-output.dto';
import { UseCaseContract } from '@/shared/application/usecases/use-case';
import { UserRepository } from '@/users/domain/repositories/user.repository';
import { Role } from '@/users/domain/entities/role.enum';

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace ListMyShopInvitationsUseCase {
  export type Input = { barberId: string };
  export type Output = ShopInvitationOutput[];

  export class UseCase implements UseCaseContract<Input, Output> {
    constructor(
      private readonly users: UserRepository.Repository,
      private readonly staff: BarberShopStaffRepository.Repository,
    ) {}

    async execute({ barberId }: Input): Promise<Output> {
      const user = await this.users.findById(barberId);
      if (!user || user.role !== Role.barber) return [];
      const invitations = await this.staff.listBarberInvitations(barberId);
      return invitations.map(ShopStaffOutputMapper.invitationToOutput);
    }
  }
}
