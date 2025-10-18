import { Entity } from '@/shared/domain/entities/entity';
import { AppointmentStatus } from './appointmentStatus.enum';

export type ApointmentProps = {
  date: Date;
  status: AppointmentStatus;
  clientId: string;
  serviceId: string;
  barberId: string;
  barberShopId: string;
  createdAt?: Date;
};

export class AppointmentEntity extends Entity<ApointmentProps> {}
