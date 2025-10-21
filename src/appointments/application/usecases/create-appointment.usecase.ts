import { UseCaseContract } from '@/shared/application/usecases/use-case';
import {
  AppointmentOutput,
  AppointmentOutputMapper,
} from '../dto/appointments-output.dto';
import { AppointmentsRepository } from '@/appointments/domain/repositories/appointments.repository';
import { ServicesRepository } from '@/services/domain/repositories/services.repository';
import { BadRequestError } from '@/shared/application/errors/bad-request-error';
import { AppointmentEntity } from '@/appointments/domain/entities/appointment.entity';
import { AppointmentStatus } from '@/appointments/domain/entities/appointmentStatus.enum';

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace CreateAppointmentsUseCase {
  export type Input = {
    clientId: string;
    serviceId: string;
    date: Date;
  };

  export type Output = AppointmentOutput;

  export class UseCase implements UseCaseContract<Input, Output> {
    constructor(
      private appointmentRepository: AppointmentsRepository.Repository,
      private serviceRepository: ServicesRepository.Repository,
    ) {}

    async execute(input: Input): Promise<AppointmentOutput> {
      const { clientId, serviceId, date } = input;

      const service = await this.serviceRepository.findById(serviceId);
      if (!service) {
        throw new BadRequestError('Service not found');
      }
      const isAvailable = await this.appointmentRepository.verifyAvailability(
        date,
        serviceId,
      );
      if (!isAvailable) {
        throw new BadRequestError('Appointment not available');
      }
      const entity = new AppointmentEntity({
        clientId,
        serviceId,
        date,
        status: AppointmentStatus.scheduled,
        barberShopId: service.barberShopId,
      });

      await this.appointmentRepository.insert(entity);

      return AppointmentOutputMapper.toOutput(entity);
    }
  }
}
