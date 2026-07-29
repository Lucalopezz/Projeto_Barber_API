import {
  BarberAvailabilityOutput,
  BarberScheduleOutput,
  BarberTimeOffOutput,
} from '@/appointments/application/dto/barber-availability-output.dto';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

// Present the barber's schedule n a structured format
export class BarberSchedulePresenter {
  @ApiProperty({ format: 'uuid' })
  id: string;
  @ApiProperty({ example: 1, minimum: 0, maximum: 6 })
  dayOfWeek: number;
  @ApiProperty({ example: 540 })
  startMinute: number;
  @ApiProperty({ example: 720 })
  endMinute: number;

  constructor(output: BarberScheduleOutput) {
    Object.assign(this, output);
  }
}

// Present the barber's time off in a structured format
export class BarberTimeOffPresenter {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({
    type: String,
    format: 'date-time',
    example: '2026-08-01T12:00:00.000Z',
  })
  @Transform(({ value }: { value: Date }) => value.toISOString())
  startsAt: Date;

  @ApiProperty({
    type: String,
    format: 'date-time',
    example: '2026-08-01T15:00:00.000Z',
  })
  @Transform(({ value }: { value: Date }) => value.toISOString())
  endsAt: Date;

  @ApiProperty({ example: 'Folga', nullable: true })
  reason: string | null;

  constructor(output: BarberTimeOffOutput) {
    Object.assign(this, output);
  }
}

// Present the barber's availability, including schedules and time offs
export class BarberAvailabilityPresenter {
  @ApiProperty({ format: 'uuid' })
  barberId: string;
  @ApiProperty({ example: 'America/Sao_Paulo' })
  timezone: string;
  @ApiProperty({ type: [BarberSchedulePresenter] })
  schedules: BarberSchedulePresenter[];
  @ApiProperty({ type: [BarberTimeOffPresenter] })
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
