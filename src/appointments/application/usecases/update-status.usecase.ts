import { AppointmentBookingPolicy } from '../services/appointment-booking-policy';
import { AppointmentStatus } from '@/appointments/domain/entities/appointmentStatus.enum';
import {
  AppointmentOutput,
  AppointmentOutputMapper,
} from '../dto/appointments-output.dto';
import { AppointmentsRepository } from '@/appointments/domain/repositories/appointments.repository';
import { NotFoundError } from '@/shared/domain/errors/not-found-error';
import { BarberShopRepository } from '@/barberShop/domain/repositories/barbershop.repository';
import { UnauthorizedError } from '@/shared/application/errors/unauthorized-error';
import { UseCaseContract } from '@/shared/application/usecases/use-case';
import { UserRepository } from '@/users/domain/repositories/user.repository';
import { ConflictError } from '@/shared/domain/errors/conflict-error';
import { ServicesRepository } from '@/services/domain/repositories/services.repository';
import {
  BookingTransactionContext,
  ProfessionalBookingTransaction,
} from '../ports/professional-booking-transaction';

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace UpdateStatusUseCase {
  export type Input = {
    id: string;
    newStatus: AppointmentStatus;
    userId: string;
  };

  export type Output = AppointmentOutput;

  export class UseCase implements UseCaseContract<Input, Output> {
    constructor(
      private appointmentRepository: AppointmentsRepository.Repository,
      private barberShopRepository: BarberShopRepository.Repository,
      private userRepository: UserRepository.Repository,
      private bookingPolicy: AppointmentBookingPolicy = new AppointmentBookingPolicy(),
      private bookingTransaction?: ProfessionalBookingTransaction,
      private serviceRepository?: ServicesRepository.Repository,
    ) { }

    async execute(input: Input): Promise<AppointmentOutput> {
      const { id, newStatus, userId } = input;

      const [appointment, user] = await Promise.all([
        this.appointmentRepository.findById(id),
        this.userRepository.findById(userId),
      ]);

      if (!appointment) {
        throw new NotFoundError('Appointment not found');
      }
      if (!user) {
        throw new NotFoundError('User not found');
      }

      const professionalBarberShopId = user.barberShopId ?? null;
      const isClient = appointment.clientId === user.id;
      const isAssignedProfessional =
        appointment.barberId === user.id &&
        appointment.barberShopId === professionalBarberShopId;
      const canCancel =
        newStatus === AppointmentStatus.cancelled &&
        (isClient || isAssignedProfessional);
      const canComplete =
        newStatus === AppointmentStatus.completed && isAssignedProfessional;

      if (!canCancel && !canComplete) {
        throw new UnauthorizedError(
          'You are not authorized to update this appointment',
        );
      }

      if (appointment.status !== AppointmentStatus.scheduled) {
        throw new ConflictError(
          'Only scheduled appointments can have their status updated',
        );
      }

      if (
        isClient &&
        !isAssignedProfessional &&
        newStatus === AppointmentStatus.cancelled
      ) {
        this.bookingPolicy.ensureCustomerCancellationAllowed(appointment.date);
      }
      const revision = (appointment.toJSON().version ?? 0) + 1;
      const work = async (
        context: Pick<
          BookingTransactionContext,
          'appointments' | 'notificationOutbox'
        >,
      ): Promise<Output> => {
        // Load the snapshot only for cancellation. Completing retains the existing behavior.
        const cancellation =
          newStatus === AppointmentStatus.cancelled &&
          context.notificationOutbox;
        const [service, barberShop] = cancellation
          ? await Promise.all([
            this.serviceRepository?.findById(appointment.serviceId),
            this.barberShopRepository.findById(appointment.barberShopId),
          ])
          : [null, null];
        if (cancellation && !service)
          throw new NotFoundError('Service not found');
        if (cancellation && !barberShop)
          throw new NotFoundError('BarberShop not found');
        appointment.updateStatus(newStatus);
        await context.appointments.update(appointment);
        if (cancellation) {
          const recipientIds = [
            ...new Set([appointment.clientId, appointment.barberId]),
          ].filter((recipientId) => recipientId !== userId);
          if (recipientIds.length)
            await context.notificationOutbox.recordCancelled({
              appointmentId: appointment.id,
              recipientIds,
              serviceName: service.name,
              barberShopName: barberShop.name,
              startsAt: appointment.date,
              timezone: barberShop.timezone,
              revision,
            });
        }
        return AppointmentOutputMapper.toOutput(appointment);
      };
      if (this.bookingTransaction)
        return this.bookingTransaction.run(appointment.barberId, work);
      // Legacy isolated compositions have no outbox; HTTP always supplies the transaction.
      return work({ appointments: this.appointmentRepository });
    }
  }
}
