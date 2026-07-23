import {
  BarberShopOutput,
  BarberShopOutputMapper,
} from '@/barberShop/application/dtos/barberShop-output.dto';
import { BarberShopEntity } from '@/barberShop/domain/entities/barber-shop.entity';
import { Role } from '@/users/domain/entities/role.enum';
import { UserEntity } from '@/users/domain/entities/user.entity';

export type BarberShopRelationship = 'owner' | 'barber';

export type BarberShopContextOutput = BarberShopOutput & {
  relationship: BarberShopRelationship;
};

export type UserContextOutput = {
  id: string;
  email: string;
  name: string;
  role: Role;
  createdAt: Date;
  barberShop: BarberShopContextOutput | null;
};

export class UserContextOutputMapper {
  static toOutput(
    user: UserEntity,
    barberShop: BarberShopEntity | null,
    relationship: BarberShopRelationship | null,
  ): UserContextOutput {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      createdAt: user.createdAt,
      barberShop:
        barberShop && relationship
          ? {
              ...BarberShopOutputMapper.toOutput(barberShop),
              relationship,
            }
          : null,
    };
  }
}
