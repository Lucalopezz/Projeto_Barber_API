import { Prisma, PrismaClient } from '@prisma/client';
import { BarberAvailabilityRepository } from '@/appointments/domain/repositories/barber-availability.repository';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { BarberScheduleEntity } from '@/appointments/domain/entities/barber-schedule.entity';
import { BarberTimeOffEntity } from '@/appointments/domain/entities/barber-time-off.entity';

export class BarberAvailabilityPrismaRepository
  implements BarberAvailabilityRepository.Repository
{
  constructor(
    private prismaService: PrismaService | Prisma.TransactionClient,
  ) {}
  async findSchedules(
    barberId: string,
    dayOfWeek?: number,
  ): Promise<BarberScheduleEntity[]> {
    const models = await this.prismaService.barberSchedule.findMany({
      where: {
        barberId,
        ...(dayOfWeek !== undefined && { dayOfWeek }),
      },
      orderBy: [{ dayOfWeek: 'asc' }, { startMinute: 'asc' }],
    });
    return models.map(
      (model) =>
        new BarberScheduleEntity(
          {
            barberId: model.barberId,
            dayOfWeek: model.dayOfWeek,
            startMinute: model.startMinute,
            endMinute: model.endMinute,
          },
          model.id,
        ),
    );
  }

  async replaceSchedules(
    barberId: string,
    schedules: BarberScheduleEntity[],
  ): Promise<void> {
    const data = schedules.map((schedule) => schedule.toJSON());

    if (!('$transaction' in this.prismaService)) {
      await this.prismaService.barberSchedule.deleteMany({
        where: { barberId },
      });
      await this.prismaService.barberSchedule.createMany({ data });
      return;
    }

    const prisma = this.prismaService as PrismaClient;
    await prisma.$transaction([
      prisma.barberSchedule.deleteMany({ where: { barberId } }),
      prisma.barberSchedule.createMany({ data }),
    ]);
  }

  async findTimeOffs(barberId: string): Promise<BarberTimeOffEntity[]> {
    const models = await this.prismaService.barberTimeOff.findMany({
      where: { barberId },
      orderBy: { startsAt: 'asc' },
    });
    return models.map(
      (model) =>
        new BarberTimeOffEntity(
          {
            barberId: model.barberId,
            startsAt: model.startsAt,
            endsAt: model.endsAt,
            reason: model.reason,
          },
          model.id,
        ),
    );
  }

  async findTimeOffById(id: string): Promise<BarberTimeOffEntity | null> {
    const model = await this.prismaService.barberTimeOff.findUnique({
      where: { id },
    });
    return model
      ? new BarberTimeOffEntity(
          {
            barberId: model.barberId,
            startsAt: model.startsAt,
            endsAt: model.endsAt,
            reason: model.reason,
          },
          model.id,
        )
      : null;
  }

  async insertTimeOff(timeOff: BarberTimeOffEntity): Promise<void> {
    await this.prismaService.barberTimeOff.create({
      data: timeOff.toJSON(),
    });
  }

  async deleteTimeOff(id: string): Promise<void> {
    await this.prismaService.barberTimeOff.delete({ where: { id } });
  }

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
