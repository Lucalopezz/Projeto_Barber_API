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
import { UserRepository } from '@/users/domain/repositories/user.repository';
import { Role } from '@/users/domain/entities/role.enum';
import { UserEntity } from '@/users/domain/entities/user.entity';
import { AppointmentStatus } from '@/appointments/domain/entities/appointmentStatus.enum';
import { ConflictError } from '@/shared/domain/errors/conflict-error';

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
      private barberShopRepository: BarberShopRepository.Repository,
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

      const professionalBarberShopId =
        await this.getProfessionalBarberShopId(user);

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
