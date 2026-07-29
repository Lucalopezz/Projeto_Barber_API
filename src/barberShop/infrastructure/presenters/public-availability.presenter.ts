import { PublicAvailabilityOutput } from '@/appointments/application/dto/public-availability-output.dto';
import { Transform } from 'class-transformer';

class AvailableSlotPresenter {
  @Transform(({ value }: { value: Date }) => value.toISOString())
  startsAt: Date;
  @Transform(({ value }: { value: Date }) => value.toISOString())
  endsAt: Date;
  constructor(startsAt: Date, endsAt: Date) {
    this.startsAt = startsAt;
    this.endsAt = endsAt;
  }
}

export class PublicAvailabilityPresenter {
  date: string;
  timezone: string;
  serviceId: string;
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
