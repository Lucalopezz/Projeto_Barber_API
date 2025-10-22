import { UseCaseContract } from '@/shared/application/usecases/use-case';
import {
  AppointmentOutput,
  AppointmentOutputMapper,
} from '../dto/appointments-output.dto';
import { AppointmentsRepository } from '@/appointments/domain/repositories/appointments.repository';
import { BarberShopRepository } from '@/barberShop/domain/repositories/barbershop.repository';
import { NotFoundError } from '@/shared/domain/errors/not-found-error';
import { UnauthorizedError } from '@/shared/application/errors/unauthorized-error';
import { BadRequestError } from '@/shared/application/errors/bad-request-error';

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace UpdateAppointmentUseCase {
  export type Input = {
    id: string;
    barberId: string;
    date: Date;
    serviceId: string;
  };

  export type Output = AppointmentOutput;

  export class UseCase implements UseCaseContract<Input, Output> {
    constructor(
      private appointmentRepository: AppointmentsRepository.Repository,
      private barberShopRepository: BarberShopRepository.Repository,
    ) {}
    async execute(input: Input): Promise<AppointmentOutput> {
      const { id, barberId, date, serviceId } = input;

      const [appointment, barberShop] = await Promise.all([
        this.appointmentRepository.findById(id),
        this.barberShopRepository.findByOwnerId(barberId),
      ]);

      if (!appointment) {
        throw new NotFoundError('Appointment not found');
      }
      if (!barberShop) {
        throw new UnauthorizedError(
          'You are not authorized to update this appointment',
        );
      }
      const isAvailable = await this.appointmentRepository.verifyAvailability(
        date,
        serviceId,
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
