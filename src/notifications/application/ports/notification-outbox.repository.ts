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
  recordUpdated(event: AppointmentUpdatedNotification): Promise<void>;
  recordCancelled(event: AppointmentCancelledNotification): Promise<void>;
}

export type AppointmentUpdatedNotification = AppointmentCreatedNotification & {
  revision: number;
  previousStartsAt: Date;
  previousServiceName: string;
};

export type AppointmentCancelledNotification =
  AppointmentCreatedNotification & {
    revision: number;
  };

export interface NotificationOutboxRepository {
  findPending(afterId: string | undefined, limit: number): Promise<string[]>;
  deliver(eventId: string): Promise<void>;
}
