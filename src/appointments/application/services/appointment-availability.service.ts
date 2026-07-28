import { AppointmentsRepository } from '@/appointments/domain/repositories/appointments.repository';
import { BarberAvailabilityRepository } from '@/appointments/domain/repositories/barber-availability.repository';
import { BadRequestError } from '@/shared/application/errors/bad-request-error';

type ZonedDateParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
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
      throw new BadRequestError('Appointment not available');
    }

    if (
      await this.availabilityRepository.hasTimeOff(barberId, startsAt, endsAt)
    ) {
      throw new BadRequestError('Appointment not available');
    }

    const start = this.getZonedParts(startsAt, timezone);
    const end = this.getZonedParts(endsAt, timezone);

    // A recurring window does not silently spill into another local day.
    if (
      start.year !== end.year ||
      start.month !== end.month ||
      start.day !== end.day
    ) {
      throw new BadRequestError('Appointment not available');
    }

    const schedules = await this.availabilityRepository.findSchedules(
      barberId,
      start.dayOfWeek,
    );
    const startMinute = start.hour * 60 + start.minute;
    const endMinute = end.hour * 60 + end.minute;
    const insideSchedule = schedules.some(
      (schedule) =>
        startMinute >= schedule.startMinute && endMinute <= schedule.endMinute,
    );

    if (!insideSchedule) {
      throw new BadRequestError('Appointment not available');
    }
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
      dayOfWeek,
    };
  }
}
