import { Prisma } from '@prisma/client';
import { BarberAvailabilityRepository } from '@/appointments/domain/repositories/barber-availability.repository';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';

export class BarberAvailabilityPrismaRepository
  implements BarberAvailabilityRepository.Repository
{
  constructor(
    private prismaService: PrismaService | Prisma.TransactionClient,
  ) {}
  /**
   * Finds the availability schedules for a given barber on a specific day of the week.
   */
  async findSchedules(
    barberId: string,
    dayOfWeek: number,
  ): Promise<BarberAvailabilityRepository.Schedule[]> {
    return this.prismaService.barberSchedule.findMany({
      where: { barberId, dayOfWeek },
      select: { dayOfWeek: true, startMinute: true, endMinute: true },
    });
  }

  /**
   * Searches for appointments based on the provided search parameters.
   */
  async hasTimeOff(
    barberId: string,
    startsAt: Date,
    endsAt: Date,
  ): Promise<boolean> {
    const timeOff = await this.prismaService.barberTimeOff.findFirst({
      where: {
        barberId,
        startsAt: { lt: endsAt },
        endsAt: { gt: startsAt },
      },
      select: { id: true },
    });
    return timeOff !== null;
  }
}
