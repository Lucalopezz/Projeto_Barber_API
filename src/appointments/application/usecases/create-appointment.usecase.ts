import { UseCaseContract } from '@/shared/application/usecases/use-case';
import {
  AppointmentOutput,
  AppointmentOutputMapper,
} from '../dto/appointments-output.dto';
import { AppointmentsRepository } from '@/appointments/domain/repositories/appointments.repository';
import { ServicesRepository } from '@/services/domain/repositories/services.repository';
import { BarberShopRepository } from '@/barberShop/domain/repositories/barbershop.repository';
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
      private barberShopRepository: BarberShopRepository.Repository,
    ) {}

    async execute(input: Input): Promise<AppointmentOutput> {
      const { clientId, serviceId, date } = input;

      const service = await this.serviceRepository.findById(serviceId);
      if (!service) {
        throw new BadRequestError('Service not found');
      }
      const barberShop = await this.barberShopRepository.findById(
        service.barberShopId,
      );
      const isAvailable = await this.appointmentRepository.verifyAvailability(
        date,
        barberShop.ownerId,
      );
      if (!isAvailable) {
        throw new BadRequestError('Appointment not available');
      }
      const entity = new AppointmentEntity({
        clientId,
        serviceId,
        barberId: barberShop.ownerId,
        date,
        status: AppointmentStatus.scheduled,
      });

      await this.appointmentRepository.insert(entity);

      return AppointmentOutputMapper.toOutput(entity);
    }
  }
}
