import {
  BarberAvailabilityOutput,
  BarberScheduleOutput,
  BarberTimeOffOutput,
} from '@/appointments/application/dto/barber-availability-output.dto';
import { Transform } from 'class-transformer';

// Present the barber's schedule n a structured format
export class BarberSchedulePresenter {
  id: string;
  dayOfWeek: number;
  startMinute: number;
  endMinute: number;

  constructor(output: BarberScheduleOutput) {
    Object.assign(this, output);
  }
}

// Present the barber's time off in a structured format
export class BarberTimeOffPresenter {
  id: string;

  @Transform(({ value }: { value: Date }) => value.toISOString())
  startsAt: Date;

  @Transform(({ value }: { value: Date }) => value.toISOString())
  endsAt: Date;

  reason: string | null;

  constructor(output: BarberTimeOffOutput) {
    Object.assign(this, output);
  }
}

// Present the barber's availability, including schedules and time offs
export class BarberAvailabilityPresenter {
  barberId: string;
  timezone: string;
  schedules: BarberSchedulePresenter[];
  timeOffs: BarberTimeOffPresenter[];

  constructor(output: BarberAvailabilityOutput) {
    this.barberId = output.barberId;
    this.timezone = output.timezone;
    this.schedules = output.schedules.map(
      (schedule) => new BarberSchedulePresenter(schedule),
    );
    this.timeOffs = output.timeOffs.map(
      (timeOff) => new BarberTimeOffPresenter(timeOff),
    );
  }
}
