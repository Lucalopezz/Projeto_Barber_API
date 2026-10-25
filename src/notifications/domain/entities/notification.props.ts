export enum NotificationType {
  appointmentCreated = 'appointment_created',
  appointmentUpdated = 'appointment_updated',
  appointmentCancelled = 'appointment_cancelled',
  appointmentReminder = 'appointment_reminder',
}

export type NotificationProps = {
  userId: string;
  appointmentId: string;
  eventKey: string;
  type: NotificationType;
  serviceName: string;
  barberShopName: string;
  startsAt: Date;
  timezone: string;
  previousStartsAt?: Date | null;
  previousServiceName?: string | null;
  createdAt?: Date;
  readAt?: Date | null;
};
