import { Clock, systemClock } from '@/shared/application/providers/clock';
import { BadRequestError } from '@/shared/application/errors/bad-request-error';
import { UnauthorizedError } from '@/shared/application/errors/unauthorized-error';

export class AppointmentBookingPolicy {
  static readonly MIN_NOTICE_MS = 30 * 60 * 1000;
  static readonly MAX_HORIZON_MS = 60 * 24 * 60 * 60 * 1000;
  static readonly CUSTOMER_CANCEL_NOTICE_MS = 24 * 60 * 60 * 1000;

  constructor(private readonly clock: Clock = systemClock) {}

  isStartAllowed(startsAt: Date, timezone: string): boolean {
    if (!Number.isFinite(startsAt.getTime())) return false;
    const notice = startsAt.getTime() - this.clock.now().getTime();
    if (
      notice < AppointmentBookingPolicy.MIN_NOTICE_MS ||
      notice > AppointmentBookingPolicy.MAX_HORIZON_MS
    )
      return false;
    const minute = Number(
      new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        minute: '2-digit',
      }).format(startsAt),
    );
    return (
      minute % 30 === 0 &&
      startsAt.getUTCSeconds() === 0 &&
      startsAt.getUTCMilliseconds() === 0
    );
  }

  ensureStartAllowed(startsAt: Date, timezone: string): void {
    if (!this.isStartAllowed(startsAt, timezone)) {
      throw new BadRequestError(
        'Appointment start must be on the local 30-minute grid, at least 30 minutes and at most 60 days ahead',
      );
    }
  }

  ensureCustomerCancellationAllowed(startsAt: Date): void {
    if (
      startsAt.getTime() - this.clock.now().getTime() <
      AppointmentBookingPolicy.CUSTOMER_CANCEL_NOTICE_MS
    ) {
      throw new UnauthorizedError(
        'Customers may cancel only at least 24 hours before the appointment',
      );
    }
  }
}
