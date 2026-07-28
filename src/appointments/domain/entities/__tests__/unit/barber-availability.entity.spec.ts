import { BarberScheduleEntity } from '../../barber-schedule.entity';
import { BarberTimeOffEntity } from '../../barber-time-off.entity';
import { EntityValidationError } from '@/shared/domain/errors/validation-error';
import { randomUUID } from 'node:crypto';

describe('Barber availability entities', () => {
  const barberId = randomUUID();

  it('should create a valid recurring schedule window', () => {
    const schedule = new BarberScheduleEntity({
      barberId,
      dayOfWeek: 1,
      startMinute: 540,
      endMinute: 720,
    });

    expect(schedule.toJSON()).toEqual(
      expect.objectContaining({
        barberId,
        dayOfWeek: 1,
        startMinute: 540,
        endMinute: 720,
      }),
    );
  });

  it('should reject an invalid recurring schedule window', () => {
    expect(
      () =>
        new BarberScheduleEntity({
          barberId,
          dayOfWeek: 7,
          startMinute: 720,
          endMinute: 540,
        }),
    ).toThrow(EntityValidationError);
  });

  it('should create a valid time off', () => {
    const timeOff = new BarberTimeOffEntity({
      barberId,
      startsAt: new Date('2026-08-01T12:00:00.000Z'),
      endsAt: new Date('2026-08-01T15:00:00.000Z'),
      reason: 'Folga',
    });

    expect(timeOff.reason).toBe('Folga');
  });

  it('should reject a time off whose end is not after its start', () => {
    expect(
      () =>
        new BarberTimeOffEntity({
          barberId,
          startsAt: new Date('2026-08-01T15:00:00.000Z'),
          endsAt: new Date('2026-08-01T12:00:00.000Z'),
        }),
    ).toThrow(EntityValidationError);
  });
});
