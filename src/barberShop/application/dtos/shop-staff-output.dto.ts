import { BarberShopStaffRepository } from '@/barberShop/domain/repositories/barber-shop-staff.repository';
import { UserEntity } from '@/users/domain/entities/user.entity';

export type ShopBarberOutput = {
  id: string;
  name: string;
  role: 'owner' | 'barber';
};

export type ShopInvitationOutput = {
  id: string;
  barberShopId: string;
  shopName: string;
  barberId: string;
  barberName: string;
  email: string;
  createdAt: Date;
};

export class ShopStaffOutputMapper {
  static barberToOutput(user: UserEntity): ShopBarberOutput {
    return {
      id: user.id,
      name: user.name,
      role: user.role as ShopBarberOutput['role'],
    };
  }

  static invitationToOutput(
    details: BarberShopStaffRepository.InvitationDetails,
  ): ShopInvitationOutput {
    return {
      id: details.invitation.id,
      barberShopId: details.invitation.barberShopId,
      shopName: details.shop.name,
      barberId: details.invitation.barberId,
      barberName: details.barber.name,
      email: details.barber.email,
      createdAt: details.invitation.createdAt,
    };
  }
}
