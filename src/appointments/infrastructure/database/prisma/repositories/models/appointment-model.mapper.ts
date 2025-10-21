import { AppointmentEntity } from '@/appointments/domain/entities/appointment.entity';
import { AppointmentStatus } from '@/appointments/domain/entities/appointmentStatus.enum';
import { ValidationError } from '@/shared/domain/errors/validation-error';
import { Appointment } from '@prisma/client';

export class AppointmentModelMapper {
  static toEntity(model: Appointment) {
    const data = {
      date: model.date,
      serviceId: model.serviceId,
      clientId: model.clientId,
      barberShopId: model.barberShopId,
      status: model.status as AppointmentStatus,
      createdAt: model.createdAt,
    };
    try {
      return new AppointmentEntity(data, model.id);
    } catch {
      throw new ValidationError('An entity not be loaded');
    }
  }
}
