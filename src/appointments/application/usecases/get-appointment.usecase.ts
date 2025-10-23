import { UseCaseContract } from '@/shared/application/usecases/use-case';
import {
  AppointmentOutput,
  AppointmentOutputMapper,
} from '../dto/appointments-output.dto';
import { AppointmentsRepository } from '@/appointments/domain/repositories/appointments.repository';
import { NotFoundError } from '@/shared/domain/errors/not-found-error';

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
    ) {}
    async execute(input: Input): Promise<AppointmentOutput> {
      const appointment = await this.appointmentRepository.findById(input.id);
      if (appointment.clientId !== input.userId) {
        throw new NotFoundError('Appointment not found');
      }
      return AppointmentOutputMapper.toOutput(appointment);
    }
  }
}
