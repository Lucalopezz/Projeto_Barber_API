import { AppointmentsRepository } from '@/appointments/domain/repositories/appointments.repository';
import { AppointmentAvailabilityService } from '../services/appointment-availability.service';

export type BookingTransactionContext = {
  appointments: AppointmentsRepository.Repository;
  availability: AppointmentAvailabilityService;
};

/** Serialize availability validation and reservation persistence for a professional. */
export interface ProfessionalBookingTransaction {
  run<T>(
    barberId: string,
    work: (context: BookingTransactionContext) => Promise<T>,
  ): Promise<T>;
}
