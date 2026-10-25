export type AppointmentCreatedNotification = {
  appointmentId: string;
  recipientIds: string[];
  serviceName: string;
  barberShopName: string;
  startsAt: Date;
  timezone: string;
};

export interface NotificationOutboxWriter {
  recordCreated(event: AppointmentCreatedNotification): Promise<void>;
}

export interface NotificationOutboxRepository extends NotificationOutboxWriter {
  findPending(afterId: string | undefined, limit: number): Promise<string[]>;
  deliver(eventId: string): Promise<void>;
}
