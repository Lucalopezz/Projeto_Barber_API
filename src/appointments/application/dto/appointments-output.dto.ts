import { AppointmentEntity } from '@/appointments/domain/entities/appointment.entity';
import { AppointmentStatus } from '@/appointments/domain/entities/appointmentStatus.enum';

export type AppointmentOutput = {
  id: string;
  date: Date;
  status: AppointmentStatus;
  clientId: string;
  serviceId: string;
  barberShopId: string;
  createdAt?: Date;
};

export class AppointmentOutputMapper {
  static toOutput(appointment: AppointmentEntity): AppointmentOutput {
    return appointment.toJSON();
  }
}
