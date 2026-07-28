import { BarberScheduleEntity } from '@/appointments/domain/entities/barber-schedule.entity';
import { BarberTimeOffEntity } from '@/appointments/domain/entities/barber-time-off.entity';

export type BarberScheduleOutput = {
  id: string;
  dayOfWeek: number;
  startMinute: number;
  endMinute: number;
};

export type BarberTimeOffOutput = {
  id: string;
  startsAt: Date;
  endsAt: Date;
  reason: string | null;
};

export type BarberAvailabilityOutput = {
  barberId: string;
  timezone: string;
  schedules: BarberScheduleOutput[];
  timeOffs: BarberTimeOffOutput[];
};

export class BarberAvailabilityOutputMapper {
  static scheduleToOutput(
    schedule: BarberScheduleEntity,
  ): BarberScheduleOutput {
    return {
      id: schedule.id,
      dayOfWeek: schedule.dayOfWeek,
      startMinute: schedule.startMinute,
      endMinute: schedule.endMinute,
    };
  }

  static timeOffToOutput(timeOff: BarberTimeOffEntity): BarberTimeOffOutput {
    return {
      id: timeOff.id,
      startsAt: timeOff.startsAt,
      endsAt: timeOff.endsAt,
      reason: timeOff.reason,
    };
  }
}
