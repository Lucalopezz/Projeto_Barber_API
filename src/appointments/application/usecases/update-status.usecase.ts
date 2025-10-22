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

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace UpdateStatusUseCase {
  export type Input = {
    id: string;
    newStatus: AppointmentStatus;
    barberId: string;
  };

  export type Output = AppointmentOutput;

  export class UseCase implements UseCaseContract<Input, Output> {
    constructor(
      private appointmentRepository: AppointmentsRepository.Repository,
      private barberShopRepository: BarberShopRepository.Repository,
    ) {}

    async execute(input: Input): Promise<AppointmentOutput> {
      const { id, newStatus, barberId } = input;

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

      appointment.updateStatus(newStatus);

      await this.appointmentRepository.update(appointment);
      return AppointmentOutputMapper.toOutput(appointment);
    }
  }
}
