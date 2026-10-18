import { AppointmentBookingPolicy } from '../../appointment-booking-policy';
import { AppointmentAvailabilityService } from '../../appointment-availability.service';
import { BadRequestError } from '@/shared/application/errors/bad-request-error';

describe('Booking policy regressions', () => {
  const now = new Date('2030-01-01T12:00:00.000Z');
  const appointments = {
    findOverlappingScheduled: jest.fn().mockResolvedValue(null),
  };
  const availability = {
    hasTimeOff: jest.fn().mockResolvedValue(false),
    findSchedules: jest
      .fn()
      .mockResolvedValue([{ startMinute: 0, endMinute: 1440 }]),
  };
  const sut = new AppointmentAvailabilityService(
    appointments as any,
    availability as any,
    new AppointmentBookingPolicy({ now: () => now }),
  );
  it.each([
    '2029-12-31T12:00:00.000Z',
    '2030-01-01T12:29:59.999Z',
    '2030-03-02T12:00:00.001Z',
    '2030-01-02T12:15:00.000Z',
    '2030-01-02T12:30:01.000Z',
  ])('rejects booking outside the selected policy: %s', async (value) => {
    const startsAt = new Date(value);
    await expect(
      sut.ensureAvailable({
        barberId: 'barber',
        startsAt,
        endsAt: new Date(startsAt.getTime() + 1800000),
        timezone: 'America/Sao_Paulo',
      }),
    ).rejects.toBeInstanceOf(BadRequestError);
  });
});
