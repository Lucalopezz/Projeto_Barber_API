import { BarberShopStaffRepository } from '@/barberShop/domain/repositories/barber-shop-staff.repository';
import { BarberShopModelMapper } from './barberShop-model.mapper';
import { UserModelMapper } from '@/users/infrastructure/database/prisma/repositories/models/user-model.mapper';
import { Prisma } from '@prisma/client';

export const shopInvitationInclude = {
  barber: true,
  barberShop: true,
} as const;
type InvitationWithRelations = Prisma.BarberShopInvitationGetPayload<{
  include: typeof shopInvitationInclude;
}>;

export class ShopInvitationModelMapper {
  static toDomain(
    model: InvitationWithRelations,
  ): BarberShopStaffRepository.InvitationDetails {
    return {
      invitation: {
        id: model.id,
        barberShopId: model.barberShopId,
        barberId: model.barberId,
        createdAt: model.createdAt,
      },
      barber: UserModelMapper.toEntity(model.barber),
      shop: BarberShopModelMapper.toEntity(model.barberShop),
    };
  }
}
