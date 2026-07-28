/* eslint-disable @typescript-eslint/no-namespace */

// Defines the structure for a barber's availability schedule
export namespace BarberAvailabilityRepository {
  export type Schedule = {
    dayOfWeek: number;
    startMinute: number;
    endMinute: number;
  };

  export interface Repository {
    findSchedules(barberId: string, dayOfWeek: number): Promise<Schedule[]>;
    hasTimeOff(
      barberId: string,
      startsAt: Date,
      endsAt: Date,
    ): Promise<boolean>;
  }
}
