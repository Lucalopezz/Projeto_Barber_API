import { AppointmentsRepository } from '@/appointments/domain/repositories/appointments.repository';
import { BarberAvailabilityRepository } from '@/appointments/domain/repositories/barber-availability.repository';
import { BadRequestError } from '@/shared/application/errors/bad-request-error';

type ZonedDateParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  dayOfWeek: number;
};

export class AppointmentAvailabilityService {
  constructor(
    private appointmentsRepository: AppointmentsRepository.Repository,
    private availabilityRepository: BarberAvailabilityRepository.Repository,
  ) {}

  async ensureAvailable(input: {
    barberId: string;
    startsAt: Date;
    endsAt: Date;
    timezone: string;
    excludeAppointmentId?: string;
  }): Promise<void> {
    if (!(await this.isAvailable(input))) {
      throw new BadRequestError('Appointment not available');
    }
  }

  async isAvailable(input: {
    barberId: string;
    startsAt: Date;
    endsAt: Date;
    timezone: string;
    excludeAppointmentId?: string;
  }): Promise<boolean> {
    const { barberId, startsAt, endsAt, timezone, excludeAppointmentId } =
      input;

    const overlappingAppointment =
      await this.appointmentsRepository.findOverlappingScheduled(
        startsAt,
        endsAt,
        barberId,
        excludeAppointmentId,
      );
    if (overlappingAppointment) {
      return false;
    }

    if (
      await this.availabilityRepository.hasTimeOff(barberId, startsAt, endsAt)
    ) {
      return false;
    }

    const start = this.getZonedParts(startsAt, timezone);
    const end = this.getZonedParts(endsAt, timezone);

    const sameLocalDay =
      start.year === end.year &&
      start.month === end.month &&
      start.day === end.day;
    // Check if the appointment ends exactly at the next midnight
    const endsExactlyAtNextMidnight =
      !sameLocalDay &&
      end.hour === 0 &&
      end.minute === 0 &&
      end.second === 0 &&
      endsAt.getMilliseconds() === 0 &&
      Date.UTC(end.year, end.month - 1, end.day) -
        Date.UTC(start.year, start.month - 1, start.day) ===
        24 * 60 * 60 * 1000;

    // Midnight is the exclusive 1440 boundary of the starting day. Any
    // duration beyond it would spill into a different recurring window.
    if (!sameLocalDay && !endsExactlyAtNextMidnight) {
      return false;
    }

    const schedules = await this.availabilityRepository.findSchedules(
      barberId,
      start.dayOfWeek,
    );
    // Check if the appointment is within any of the schedules
    const startMinute =
      start.hour * 60 +
      start.minute +
      start.second / 60 +
      startsAt.getMilliseconds() / 60000;
    const endMinute = endsExactlyAtNextMidnight
      ? 1440
      : end.hour * 60 +
        end.minute +
        end.second / 60 +
        endsAt.getMilliseconds() / 60000;
    const insideSchedule = schedules.some(
      (schedule) =>
        startMinute >= schedule.startMinute && endMinute <= schedule.endMinute,
    );

    if (!insideSchedule) {
      return false;
    }
    return true;
  }

  private getZonedParts(date: Date, timezone: string): ZonedDateParts {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      weekday: 'short',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    });
    const parts = Object.fromEntries(
      formatter.formatToParts(date).map((part) => [part.type, part.value]),
    );
    const dayOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(
      parts.weekday,
    );

    return {
      year: Number(parts.year),
      month: Number(parts.month),
      day: Number(parts.day),
      hour: Number(parts.hour),
      minute: Number(parts.minute),
      second: Number(parts.second),
      dayOfWeek,
    };
  }
}
