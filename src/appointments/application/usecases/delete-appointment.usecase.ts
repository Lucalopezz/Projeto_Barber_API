import { AppointmentsRepository } from '@/appointments/domain/repositories/appointments.repository';
import { UnauthorizedError } from '@/shared/application/errors/unauthorized-error';
import { UseCaseContract } from '@/shared/application/usecases/use-case';
import { NotFoundError } from '@/shared/domain/errors/not-found-error';

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace DeleteAppointmentUseCase {
  export type Input = {
    id: string;
    userId: string;
  };
  export type Output = void;

  export class UseCase implements UseCaseContract<Input, Output> {
    constructor(
      private appointmentrepository: AppointmentsRepository.Repository,
    ) {}

    async execute(input: Input): Promise<Output> {
      const appointment = await this.appointmentrepository.findById(input.id);

      if (!appointment) {
        throw new NotFoundError('Appointment not found');
      }

      if (appointment.clientId !== input.userId) {
        throw new UnauthorizedError('Unauthorized');
      }

      await this.appointmentrepository.delete(input.id);
    }
  }
}
