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
import { Role } from '@/users/domain/entities/role.enum';
import { UserEntity } from '@/users/domain/entities/user.entity';
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

      const professionalBarberShopId =
        await this.getProfessionalBarberShopId(user);
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

    private async getProfessionalBarberShopId(
      user: UserEntity,
    ): Promise<string | null> {
      if (user.role === Role.owner) {
        const barberShop = await this.barberShopRepository.findByOwnerId(
          user.id,
        );
        return barberShop?.id ?? null;
      }

      if (user.role === Role.barber) {
        return user.barberShopId;
      }

      return null;
    }
  }
}
