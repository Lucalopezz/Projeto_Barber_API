import type { AppointmentStatus } from './appointmentStatus.enum';

export type AppointmentProps = {
  date: Date;
  endDate: Date;
  status: AppointmentStatus;
  clientId: string;
  barberId: string;
  barberShopId: string;
  serviceId: string;
  createdAt?: Date;
};
