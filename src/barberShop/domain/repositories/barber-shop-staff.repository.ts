import { BarberShopEntity } from '../entities/barber-shop.entity';
import { UserEntity } from '@/users/domain/entities/user.entity';

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace BarberShopStaffRepository {
  export type Invitation = {
    id: string;
    barberShopId: string;
    barberId: string;
    createdAt: Date;
  };

  export type InvitationDetails = {
    invitation: Invitation;
    barber: UserEntity;
    shop: BarberShopEntity;
  };

  export interface Repository {
    listBarbers(shopId: string): Promise<UserEntity[]>;
    listShopInvitations(shopId: string): Promise<InvitationDetails[]>;
    listBarberInvitations(barberId: string): Promise<InvitationDetails[]>;
    findInvitation(id: string): Promise<InvitationDetails | null>;
    createInvitation(
      shopId: string,
      barberId: string,
    ): Promise<InvitationDetails>;
    deleteInvitation(id: string): Promise<void>;
    acceptInvitation(
      id: string,
      barberId: string,
      shopId: string,
    ): Promise<boolean>;
    removeBarber(
      shopId: string,
      barberId: string,
    ): Promise<'removed' | 'booked' | 'missing'>;
  }
}
