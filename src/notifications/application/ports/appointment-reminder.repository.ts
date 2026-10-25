export type AppointmentReminderCandidate = {
  appointmentId: string;
  clientId: string;
  version: number;
  startsAt: Date;
  createdAt: Date;
  serviceName: string;
  barberShopName: string;
  timezone: string;
};

export interface AppointmentReminderRepository {
  findCandidates(
    now: Date,
    afterId: string | undefined,
    limit: number,
  ): Promise<AppointmentReminderCandidate[]>;
  recordReminders(candidates: AppointmentReminderCandidate[]): Promise<void>;
}
