export enum NotificationType {
  appointmentCreated = 'appointment_created',
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
  createdAt?: Date;
  readAt?: Date | null;
};
