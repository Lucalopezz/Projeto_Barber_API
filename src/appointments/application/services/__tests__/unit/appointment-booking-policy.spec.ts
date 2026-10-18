import { AppointmentBookingPolicy } from '../../appointment-booking-policy';
import { UnauthorizedError } from '@/shared/application/errors/unauthorized-error';

describe('AppointmentBookingPolicy boundaries and local grid', () => {
  const now = new Date('2030-01-01T12:00:00.000Z');
  const sut = new AppointmentBookingPolicy({ now: () => new Date(now) });
  it.each([
    ['2030-01-01T12:30:00.000Z', 'America/Sao_Paulo', true],
    ['2030-03-02T12:00:00.000Z', 'America/Sao_Paulo', true],
    ['2030-03-02T12:30:00.000Z', 'America/Sao_Paulo', false],
    ['2030-01-02T12:15:00.000Z', 'Asia/Kathmandu', true],
    ['2030-01-02T12:00:00.000Z', 'Asia/Kathmandu', false],
    ['2030-01-02T12:15:00.001Z', 'Asia/Kathmandu', false],
    ['2030-01-02T12:15:01.000Z', 'Asia/Kathmandu', false],
    ['invalid', 'UTC', false],
  ])('validates %s in %s: %s', (date, timezone, expected) => {
    expect(
      sut.isStartAllowed(new Date(date as string), timezone as string),
    ).toBe(expected);
  });
  it('measures notice in elapsed milliseconds across timezone/DST dates', () => {
    const reference = new Date('2030-03-10T06:30:00.000Z');
    const policy = new AppointmentBookingPolicy({ now: () => reference });
    expect(
      policy.isStartAllowed(
        new Date('2030-03-10T07:00:00.000Z'),
        'America/New_York',
      ),
    ).toBe(true);
    expect(
      policy.isStartAllowed(
        new Date('2030-03-10T06:30:00.000Z'),
        'America/New_York',
      ),
    ).toBe(false);
  });
  it('allows cancellation exactly 24 hours before but rejects one millisecond later', () => {
    const start = new Date('2030-01-02T12:00:00.000Z');
    expect(() => sut.ensureCustomerCancellationAllowed(start)).not.toThrow();
    const policy = new AppointmentBookingPolicy({
      now: () => new Date(now.getTime() + 1),
    });
    expect(() => policy.ensureCustomerCancellationAllowed(start)).toThrow(
      UnauthorizedError,
    );
  });
});
