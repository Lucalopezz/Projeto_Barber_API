import { AppointmentsRepository } from '@/appointments/domain/repositories/appointments.repository';
import { AppointmentAvailabilityService } from '../services/appointment-availability.service';
import { NotificationOutboxWriter } from '@/notifications/application/ports/notification-outbox.repository';

export type BookingTransactionContext = {
  appointments: AppointmentsRepository.Repository;
  availability: AppointmentAvailabilityService;
  notificationOutbox?: NotificationOutboxWriter;
};

/** Serialize availability validation and reservation persistence for a professional. */
export interface ProfessionalBookingTransaction {
  run<T>(
    barberId: string,
    work: (context: BookingTransactionContext) => Promise<T>,
  ): Promise<T>;
}
