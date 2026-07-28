import { randomUUID } from 'node:crypto';
import { BarberScheduleValidatorFactory } from '../../barber-schedule.validator';
import { BarberTimeOffValidatorFactory } from '../../barber-time-off.validator';

describe('Barber availability validators', () => {
  const barberId = randomUUID();

  describe('BarberScheduleValidator', () => {
    it('should validate a schedule window', () => {
      const validator = BarberScheduleValidatorFactory.create();

      expect(
        validator.validate({
          barberId,
          dayOfWeek: 1,
          startMinute: 540,
          endMinute: 720,
        }),
      ).toBe(true);
      expect(validator.validatedData).toBeDefined();
    });

    it('should reject invalid limits and an end before the start', () => {
      const validator = BarberScheduleValidatorFactory.create();

      expect(
        validator.validate({
          barberId: 'invalid-id',
          dayOfWeek: 7,
          startMinute: 720,
          endMinute: 540,
        }),
      ).toBe(false);
      expect(validator.errors).toEqual(
        expect.objectContaining({
          barberId: expect.any(Array),
          dayOfWeek: expect.any(Array),
          endMinute: expect.arrayContaining([
            'endMinute must be greater than startMinute',
          ]),
        }),
      );
    });
  });

  describe('BarberTimeOffValidator', () => {
    it('should validate a time off', () => {
      const validator = BarberTimeOffValidatorFactory.create();

      expect(
        validator.validate({
          barberId,
          startsAt: new Date('2026-08-01T12:00:00.000Z'),
          endsAt: new Date('2026-08-01T15:00:00.000Z'),
          reason: 'Folga',
        }),
      ).toBe(true);
      expect(validator.validatedData).toBeDefined();
    });

    it('should reject invalid dates, interval and reason', () => {
      const validator = BarberTimeOffValidatorFactory.create();

      expect(
        validator.validate({
          barberId,
          startsAt: new Date('2026-08-01T15:00:00.000Z'),
          endsAt: new Date('2026-08-01T12:00:00.000Z'),
          reason: 'x'.repeat(256),
        }),
      ).toBe(false);
      expect(validator.errors).toEqual(
        expect.objectContaining({
          endsAt: expect.arrayContaining(['endsAt must be after startsAt']),
          reason: expect.any(Array),
        }),
      );
    });
  });
});
