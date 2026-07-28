/* eslint-disable @typescript-eslint/no-namespace */

import { BarberScheduleEntity } from '../entities/barber-schedule.entity';
import { BarberTimeOffEntity } from '../entities/barber-time-off.entity';

export namespace BarberAvailabilityRepository {
  export interface Repository {
    findSchedules(
      barberId: string,
      dayOfWeek?: number,
    ): Promise<BarberScheduleEntity[]>;

    replaceSchedules(
      barberId: string,
      schedules: BarberScheduleEntity[],
    ): Promise<void>;

    findTimeOffs(barberId: string): Promise<BarberTimeOffEntity[]>;

    findTimeOffById(id: string): Promise<BarberTimeOffEntity | null>;

    insertTimeOff(timeOff: BarberTimeOffEntity): Promise<void>;

    deleteTimeOff(id: string): Promise<void>;

    hasTimeOff(
      barberId: string,
      startsAt: Date,
      endsAt: Date,
    ): Promise<boolean>;
  }
}
