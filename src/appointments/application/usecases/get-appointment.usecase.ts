import { UseCaseContract } from '@/shared/application/usecases/use-case';
import {
  AppointmentOutput,
  AppointmentOutputMapper,
} from '../dto/appointments-output.dto';
import { AppointmentsRepository } from '@/appointments/domain/repositories/appointments.repository';
import { NotFoundError } from '@/shared/domain/errors/not-found-error';
import { UserRepository } from '@/users/domain/repositories/user.repository';
import { Role } from '@/users/domain/entities/role.enum';

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace GetAppointmentUseCase {
  export type Input = {
    id: string;
    userId: string;
  };

  export type Output = AppointmentOutput;

  export class UseCase implements UseCaseContract<Input, Output> {
    constructor(
      private appointmentRepository: AppointmentsRepository.Repository,
      private userRepository: UserRepository.Repository,
    ) {}
    async execute(input: Input): Promise<AppointmentOutput> {
      const [appointment, user] = await Promise.all([
        this.appointmentRepository.findById(input.id),
        this.userRepository.findById(input.userId),
      ]);
      if (!appointment || !user) {
        throw new NotFoundError('Appointment not found');
      }

      const isClient = appointment.clientId === user.id;
      const isOwner =
        user.role === Role.owner &&
        user.barberShopId === appointment.barberShopId;
      const isAssignedBarber =
        user.role === Role.barber &&
        user.barberShopId === appointment.barberShopId &&
        appointment.barberId === user.id;

      if (!isClient && !isOwner && !isAssignedBarber) {
        throw new NotFoundError('Appointment not found');
      }

      return AppointmentOutputMapper.toOutput(appointment);
    }
  }
}
