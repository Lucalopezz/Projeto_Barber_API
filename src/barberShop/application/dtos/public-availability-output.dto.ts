export type AvailableSlotOutput = {
  startsAt: Date;
  endsAt: Date;
};

export type PublicAvailabilityOutput = {
  date: string;
  timezone: string;
  serviceId: string;
  slots: AvailableSlotOutput[];
};
