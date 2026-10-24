import { BarberShopStaffRepository } from '@/barberShop/domain/repositories/barber-shop-staff.repository';
import { UserEntity } from '@/users/domain/entities/user.entity';
import { UserModelMapper } from '@/users/infrastructure/database/prisma/repositories/models/user-model.mapper';
import {
  ShopInvitationModelMapper,
  shopInvitationInclude,
} from './models/shop-invitation-model.mapper';
import { ConflictError } from '@/shared/domain/errors/conflict-error';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { Prisma } from '@prisma/client';

export class BarberShopStaffPrismaRepository
  implements BarberShopStaffRepository.Repository
{
  constructor(private readonly prisma: PrismaService) {}

  async listBarbers(shopId: string): Promise<UserEntity[]> {
    const users = await this.prisma.user.findMany({
      where: { barberShopId: shopId, role: { in: ['owner', 'barber'] } },
      orderBy: [{ role: 'desc' }, { name: 'asc' }],
    });
    return users.map((user) => UserModelMapper.toEntity(user));
  }

  async listShopInvitations(
    shopId: string,
  ): Promise<BarberShopStaffRepository.InvitationDetails[]> {
    const invitations = await this.prisma.barberShopInvitation.findMany({
      where: { barberShopId: shopId },
      include: shopInvitationInclude,
      orderBy: { createdAt: 'desc' },
    });
    return invitations.map(ShopInvitationModelMapper.toDomain);
  }

  async listBarberInvitations(
    barberId: string,
  ): Promise<BarberShopStaffRepository.InvitationDetails[]> {
    const invitations = await this.prisma.barberShopInvitation.findMany({
      where: { barberId },
      include: shopInvitationInclude,
      orderBy: { createdAt: 'desc' },
    });
    return invitations.map(ShopInvitationModelMapper.toDomain);
  }

  async findInvitation(
    id: string,
  ): Promise<BarberShopStaffRepository.InvitationDetails | null> {
    const model = await this.prisma.barberShopInvitation.findUnique({
      where: { id },
      include: shopInvitationInclude,
    });
    return model ? ShopInvitationModelMapper.toDomain(model) : null;
  }

  async createInvitation(
    shopId: string,
    barberId: string,
  ): Promise<BarberShopStaffRepository.InvitationDetails> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        // Accepting an invitation locks this same row before joining a shop.
        await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${barberId} FOR UPDATE`;
        const barber = await tx.user.findUnique({ where: { id: barberId } });
        if (!barber || barber.role !== 'barber' || barber.barberShopId) {
          throw new ConflictError('Barber already belongs to a shop');
        }
        const model = await tx.barberShopInvitation.create({
          data: { barberShopId: shopId, barberId },
          include: shopInvitationInclude,
        });
        return ShopInvitationModelMapper.toDomain(model);
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictError('Invitation already pending');
      }
      throw error;
    }
  }

  async deleteInvitation(id: string): Promise<void> {
    await this.prisma.barberShopInvitation.deleteMany({ where: { id } });
  }

  async acceptInvitation(
    id: string,
    barberId: string,
    shopId: string,
  ): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      // Serialize acceptance with other invitations and removal for this barber.
      await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${barberId} FOR UPDATE`;
      const invitation = await tx.barberShopInvitation.findFirst({
        where: { id, barberId, barberShopId: shopId },
      });
      if (!invitation) return false;
      const updated = await tx.user.updateMany({
        where: { id: barberId, role: 'barber', barberShopId: null },
        data: { barberShopId: shopId },
      });
      if (updated.count !== 1) return false;
      // A barber can join only one shop; other pending invitations are now stale.
      await tx.barberShopInvitation.deleteMany({ where: { barberId } });
      return true;
    });
  }

  async removeBarber(
    shopId: string,
    barberId: string,
  ): Promise<'removed' | 'booked' | 'missing'> {
    return this.prisma.$transaction(async (tx) => {
      // Booking locks the same user row, so a new reservation cannot slip past this check.
      await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${barberId} FOR UPDATE`;
      const barber = await tx.user.findFirst({
        where: { id: barberId, barberShopId: shopId, role: 'barber' },
        select: { id: true },
      });
      if (!barber) return 'missing';
      const booked = await tx.appointment.count({
        where: {
          barberId,
          barberShopId: shopId,
          status: 'scheduled',
          date: { gt: new Date() },
        },
      });
      if (booked) return 'booked';
      await tx.barberSchedule.deleteMany({ where: { barberId } });
      await tx.barberTimeOff.deleteMany({ where: { barberId } });
      await tx.user.update({
        where: { id: barberId },
        data: { barberShopId: null },
      });
      return 'removed';
    });
  }
}
