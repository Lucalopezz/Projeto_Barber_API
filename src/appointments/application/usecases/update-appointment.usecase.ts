import { UseCaseContract } from '@/shared/application/usecases/use-case';
import {
  AppointmentOutput,
  AppointmentOutputMapper,
} from '../dto/appointments-output.dto';
import { AppointmentsRepository } from '@/appointments/domain/repositories/appointments.repository';
import { NotFoundError } from '@/shared/domain/errors/not-found-error';
import { UnauthorizedError } from '@/shared/application/errors/unauthorized-error';
import { BadRequestError } from '@/shared/application/errors/bad-request-error';
import { UserRepository } from '@/users/domain/repositories/user.repository';
import { AppointmentStatus } from '@/appointments/domain/entities/appointmentStatus.enum';
import { ConflictError } from '@/shared/domain/errors/conflict-error';
import { ServicesRepository } from '@/services/domain/repositories/services.repository';

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace UpdateAppointmentUseCase {
  export type Input = {
    id: string;
    userId: string;
    date: Date;
    serviceId: string;
  };

  export type Output = AppointmentOutput;

  export class UseCase implements UseCaseContract<Input, Output> {
    constructor(
      private appointmentRepository: AppointmentsRepository.Repository,
      private serviceRepository: ServicesRepository.Repository,
      private userRepository: UserRepository.Repository,
    ) {}
    async execute(input: Input): Promise<AppointmentOutput> {
      const { id, userId, date, serviceId } = input;

      const [appointment, user] = await Promise.all([
        this.appointmentRepository.findById(id),
        this.userRepository.findById(userId),
      ]);

      if (!appointment) {
        throw new NotFoundError('Appointment not found');
      }

      const service = await this.serviceRepository.findById(serviceId);
      if (!service) {
        throw new NotFoundError('Service not found');
      }
      if (service.barberShopId !== appointment.barberShopId) {
        throw new BadRequestError(
          'Service does not belong to the same barber shop as the appointment',
        );
      }

      const professionalBarberShopId = user.barberShopId ?? null;

      // if the barber is not the barber assigned to the appointment or the appointment is not in his barber shop
      if (
        appointment.barberShopId !== professionalBarberShopId ||
        appointment.barberId !== user.id
      ) {
        throw new UnauthorizedError(
          'You are not authorized to update this appointment',
        );
      }

      if (appointment.status !== AppointmentStatus.scheduled) {
        throw new ConflictError('Only scheduled appointments can be updated');
      }

      const isAvailable = await this.appointmentRepository.verifyAvailability(
        date,
        appointment.barberId,
      );
      if (!isAvailable) {
        throw new BadRequestError('Appointment not available');
      }

      appointment.update(date, serviceId);

      await this.appointmentRepository.update(appointment);
      return AppointmentOutputMapper.toOutput(appointment);
    }
  }
}
