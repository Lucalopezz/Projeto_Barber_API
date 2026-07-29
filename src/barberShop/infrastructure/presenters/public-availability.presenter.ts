import { PublicAvailabilityOutput } from '@/barberShop/application/dtos/public-availability-output.dto';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

class AvailableSlotPresenter {
  @ApiProperty({
    type: String,
    format: 'date-time',
    example: '2026-08-03T12:00:00.000Z',
  })
  @Transform(({ value }: { value: Date }) => value.toISOString())
  startsAt: Date;
  @ApiProperty({
    type: String,
    format: 'date-time',
    example: '2026-08-03T12:45:00.000Z',
  })
  @Transform(({ value }: { value: Date }) => value.toISOString())
  endsAt: Date;
  constructor(startsAt: Date, endsAt: Date) {
    this.startsAt = startsAt;
    this.endsAt = endsAt;
  }
}

export class PublicAvailabilityPresenter {
  @ApiProperty({ format: 'date', example: '2026-08-03' })
  date: string;
  @ApiProperty({ example: 'America/Sao_Paulo' })
  timezone: string;
  @ApiProperty({ format: 'uuid' })
  serviceId: string;
  @ApiProperty({ type: [AvailableSlotPresenter] })
  slots: AvailableSlotPresenter[];
  constructor(output: PublicAvailabilityOutput) {
    this.date = output.date;
    this.timezone = output.timezone;
    this.serviceId = output.serviceId;
    this.slots = output.slots.map(
      (slot) => new AvailableSlotPresenter(slot.startsAt, slot.endsAt),
    );
  }
}
