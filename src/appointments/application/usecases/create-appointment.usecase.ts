import {
  ProfessionalBookingTransaction,
  BookingTransactionContext,
} from '../ports/professional-booking-transaction';
import { UseCaseContract } from '@/shared/application/usecases/use-case';
import {
  AppointmentOutput,
  AppointmentOutputMapper,
} from '../dto/appointments-output.dto';
import { AppointmentsRepository } from '@/appointments/domain/repositories/appointments.repository';
import { ServicesRepository } from '@/services/domain/repositories/services.repository';
import { BarberShopRepository } from '@/barberShop/domain/repositories/barbershop.repository';
import { BadRequestError } from '@/shared/application/errors/bad-request-error';
import { AppointmentEntity } from '@/appointments/domain/entities/appointment.entity';
import { AppointmentStatus } from '@/appointments/domain/entities/appointmentStatus.enum';
import { AppointmentAvailabilityService } from '../services/appointment-availability.service';
import { UserRepository } from '@/users/domain/repositories/user.repository';
import { Role } from '@/users/domain/entities/role.enum';

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace CreateAppointmentsUseCase {
  export type Input = {
    clientId: string;
    serviceId: string;
    date: Date;
    barberId?: string;
  };

  export type Output = AppointmentOutput;

  export class UseCase implements UseCaseContract<Input, Output> {
    constructor(
      private appointmentRepository: AppointmentsRepository.Repository,
      private serviceRepository: ServicesRepository.Repository,
      private barberShopRepository: BarberShopRepository.Repository,
      private availabilityService: AppointmentAvailabilityService,
      private bookingTransaction?: ProfessionalBookingTransaction,
      private userRepository?: UserRepository.Repository,
    ) {}

    async execute(input: Input): Promise<AppointmentOutput> {
      const { clientId, serviceId, date } = input;

      const service = await this.serviceRepository.findById(serviceId);
      if (!service) {
        throw new BadRequestError('Service not found');
      }
      const barberShop = await this.barberShopRepository.findById(
        service.barberShopId,
      );
      if (!barberShop) {
        throw new BadRequestError('BarberShop not found');
      }
      const barberId = input.barberId ?? barberShop.ownerId;
      const endDate = new Date(date.getTime() + service.duration * 60 * 1000);
      const work = async (
        context: BookingTransactionContext,
      ): Promise<Output> => {
        // The booking transaction locks the selected barber's user row. Check
        // membership after that lock so an owner cannot unlink them mid-booking.
        if (barberId !== barberShop.ownerId) {
          const barber = await this.userRepository?.findById(barberId);
          if (
            !barber ||
            barber.role !== Role.barber ||
            barber.barberShopId !== barberShop.id
          ) {
            throw new BadRequestError('Barber does not belong to BarberShop');
          }
        }
        await context.availability.ensureAvailable({
          barberId,
          startsAt: date,
          endsAt: endDate,
          timezone: barberShop.timezone,
        });
        const entity = new AppointmentEntity({
          clientId,
          serviceId,
          barberId,
          barberShopId: barberShop.id,
          date,
          endDate,
          status: AppointmentStatus.scheduled,
        });

        await context.appointments.insert(entity);

        return AppointmentOutputMapper.toOutput(entity);
      };
      if (this.bookingTransaction)
        return this.bookingTransaction.run(barberId, work);
      // Direct composition is retained for existing isolated application tests.
      // The HTTP module always supplies the transactional production adapter.
      return work({
        appointments: this.appointmentRepository,
        availability: this.availabilityService,
      });
    }
  }
}
