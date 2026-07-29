import { PublicAvailabilityOutput } from '@/appointments/application/dto/public-availability-output.dto';
import { AppointmentAvailabilityService } from '@/appointments/application/services/appointment-availability.service';
import { BarberAvailabilityRepository } from '@/appointments/domain/repositories/barber-availability.repository';
import { BarberShopRepository } from '@/barberShop/domain/repositories/barbershop.repository';
import { BadRequestError } from '@/shared/application/errors/bad-request-error';
import { UseCaseContract } from '@/shared/application/usecases/use-case';
import { NotFoundError } from '@/shared/domain/errors/not-found-error';
import { ServicesRepository } from '@/services/domain/repositories/services.repository';

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace GetPublicAvailabilityUseCase {
  export type Input = { barberShopId: string; date: string; serviceId: string };
  export type Output = PublicAvailabilityOutput;
  type LocalDate = { year: number; month: number; day: number };

  export class UseCase implements UseCaseContract<Input, Output> {
    private static readonly SLOT_INTERVAL_MINUTES = 30;

    constructor(
      private barberShopRepository: BarberShopRepository.Repository,
      private servicesRepository: ServicesRepository.Repository,
      private availabilityRepository: BarberAvailabilityRepository.Repository,
      private availabilityService: AppointmentAvailabilityService,
    ) {}

    async execute(input: Input): Promise<Output> {
      const localDate = this.parseDate(input.date);
      const [barberShop, service] = await Promise.all([
        this.barberShopRepository.findById(input.barberShopId),
        this.servicesRepository.findById(input.serviceId),
      ]);
      if (!barberShop) throw new NotFoundError('BarberShop not found');
      if (!service || service.barberShopId !== barberShop.id) {
        throw new BadRequestError('Service does not belong to BarberShop');
      }

      const dayOfWeek = new Date(
        Date.UTC(localDate.year, localDate.month - 1, localDate.day),
      ).getUTCDay();
      const schedules = await this.availabilityRepository.findSchedules(
        barberShop.ownerId,
        dayOfWeek,
      );
      const slots: Output['slots'] = [];
      for (const schedule of schedules) {
        for (
          let startMinute = schedule.startMinute;
          startMinute + service.duration <= schedule.endMinute;
          startMinute += UseCase.SLOT_INTERVAL_MINUTES
        ) {
          const startsAt = this.toUtcDate(
            localDate,
            startMinute,
            barberShop.timezone,
          );
          if (
            !this.isExpectedLocalTime(
              startsAt,
              localDate,
              startMinute,
              barberShop.timezone,
            )
          )
            continue;
          const endsAt = new Date(
            startsAt.getTime() + service.duration * 60 * 1000,
          );
          if (
            await this.availabilityService.isAvailable({
              barberId: barberShop.ownerId,
              startsAt,
              endsAt,
              timezone: barberShop.timezone,
            })
          )
            slots.push({ startsAt, endsAt });
        }
      }
      return {
        date: input.date,
        timezone: barberShop.timezone,
        serviceId: service.id,
        slots,
      };
    }

    private parseDate(date: string): LocalDate {
      const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
      if (!match)
        throw new BadRequestError('Date must use the YYYY-MM-DD format');
      const [year, month, day] = match.slice(1).map(Number);
      const parsed = new Date(Date.UTC(year, month - 1, day));
      if (
        parsed.getUTCFullYear() !== year ||
        parsed.getUTCMonth() !== month - 1 ||
        parsed.getUTCDate() !== day
      ) {
        throw new BadRequestError('Date must be a valid calendar date');
      }
      return { year, month, day };
    }

    private toUtcDate(
      date: LocalDate,
      minuteOfDay: number,
      timezone: string,
    ): Date {
      const hour = Math.floor(minuteOfDay / 60);
      const minute = minuteOfDay % 60;
      const expectedUtcTime = Date.UTC(
        date.year,
        date.month - 1,
        date.day,
        hour,
        minute,
      );
      let utcTime = expectedUtcTime;
      for (let attempt = 0; attempt < 2; attempt++) {
        const local = this.localParts(new Date(utcTime), timezone);
        utcTime +=
          expectedUtcTime -
          Date.UTC(
            local.year,
            local.month - 1,
            local.day,
            local.hour,
            local.minute,
          );
      }
      return new Date(utcTime);
    }

    private isExpectedLocalTime(
      value: Date,
      date: LocalDate,
      minuteOfDay: number,
      timezone: string,
    ): boolean {
      const local = this.localParts(value, timezone);
      return (
        local.year === date.year &&
        local.month === date.month &&
        local.day === date.day &&
        local.hour * 60 + local.minute === minuteOfDay
      );
    }

    private localParts(value: Date, timezone: string) {
      const parts = Object.fromEntries(
        new Intl.DateTimeFormat('en-US', {
          timeZone: timezone,
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          hourCycle: 'h23',
        })
          .formatToParts(value)
          .map((part) => [part.type, part.value]),
      );
      return {
        year: Number(parts.year),
        month: Number(parts.month),
        day: Number(parts.day),
        hour: Number(parts.hour),
        minute: Number(parts.minute),
      };
    }
  }
}
