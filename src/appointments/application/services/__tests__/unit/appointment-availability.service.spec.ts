import { AppointmentAvailabilityService } from '../../appointment-availability.service';
import { BadRequestError } from '@/shared/application/errors/bad-request-error';
import { BarberScheduleEntity } from '@/appointments/domain/entities/barber-schedule.entity';
import { randomUUID } from 'node:crypto';

describe('AppointmentAvailabilityService', () => {
  const barberId = randomUUID();
  const appointmentsRepository = {
    findOverlappingScheduled: jest.fn(),
  };
  const availabilityRepository = {
    hasTimeOff: jest.fn(),
    findSchedules: jest.fn(),
  };
  const sut = new AppointmentAvailabilityService(
    appointmentsRepository as any,
    availabilityRepository as any,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    appointmentsRepository.findOverlappingScheduled.mockResolvedValue(null);
    availabilityRepository.hasTimeOff.mockResolvedValue(false);
    availabilityRepository.findSchedules.mockResolvedValue([
      new BarberScheduleEntity({
        barberId,
        dayOfWeek: 1,
        startMinute: 600,
        endMinute: 660,
      }),
    ]);
  });

  it('should accept an interval inside the local schedule', async () => {
    await expect(
      sut.ensureAvailable({
        barberId,
        startsAt: new Date('2026-07-27T13:00:00.000Z'),
        endsAt: new Date('2026-07-27T13:30:00.000Z'),
        timezone: 'America/Sao_Paulo',
      }),
    ).resolves.toBeUndefined();
  });

  it('should account for seconds at the end of a schedule window', async () => {
    await expect(
      sut.ensureAvailable({
        barberId,
        startsAt: new Date('2026-07-27T13:30:01.000Z'),
        endsAt: new Date('2026-07-27T14:00:01.000Z'),
        timezone: 'America/Sao_Paulo',
      }),
    ).rejects.toThrow(new BadRequestError('Appointment not available'));
  });

  it('should reject an interval that crosses a local day boundary', async () => {
    availabilityRepository.findSchedules.mockResolvedValue([
      new BarberScheduleEntity({
        barberId,
        dayOfWeek: 1,
        startMinute: 0,
        endMinute: 1440,
      }),
    ]);

    await expect(
      sut.ensureAvailable({
        barberId,
        startsAt: new Date('2026-07-28T02:30:00.000Z'),
        endsAt: new Date('2026-07-28T03:30:00.000Z'),
        timezone: 'America/Sao_Paulo',
      }),
    ).rejects.toThrow(new BadRequestError('Appointment not available'));
  });

  it('should accept midnight as the exclusive end of a local day', async () => {
    availabilityRepository.findSchedules.mockResolvedValue([
      new BarberScheduleEntity({
        barberId,
        dayOfWeek: 1,
        startMinute: 1380,
        endMinute: 1440,
      }),
    ]);

    await expect(
      sut.ensureAvailable({
        barberId,
        startsAt: new Date('2026-07-28T02:00:00.000Z'),
        endsAt: new Date('2026-07-28T03:00:00.000Z'),
        timezone: 'America/Sao_Paulo',
      }),
    ).resolves.toBeUndefined();
  });
});
