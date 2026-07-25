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
    ) {}

    async execute(input: Input): Promise<AppointmentOutput> {
      const { id, newStatus, userId } = input;

      const [appointment, user] = await Promise.all([
        this.appointmentRepository.findById(id),
        this.userRepository.findById(userId),
      ]);

      if (!appointment) {
        throw new NotFoundError('Appointment not found');
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

      appointment.updateStatus(newStatus);

      await this.appointmentRepository.update(appointment);
      return AppointmentOutputMapper.toOutput(appointment);
    }
  }
}
