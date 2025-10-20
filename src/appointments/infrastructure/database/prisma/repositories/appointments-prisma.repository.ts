/* eslint-disable @typescript-eslint/no-unused-vars */
import { AppointmentEntity } from '@/appointments/domain/entities/appointment.entity';
import { AppointmentsRepository } from '@/appointments/domain/repositories/appointments.repository';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';

export class AppointmentsPrismaRepository
  implements AppointmentsRepository.Repository
{
  constructor(private prismaService: PrismaService) {}
  sortableFields: string[] = ['date', 'createdAt', 'serviceId'];
  async verifyAvailability(date: Date, serviceId: string): Promise<boolean> {
    const isAvailable = await this.prismaService.appointment.findFirst({
      where: {
        date,
        serviceId,
      },
    });
    return !isAvailable;
  }
  search(
    props: AppointmentsRepository.AppointmentsSearchParams,
  ): Promise<AppointmentsRepository.AppointmentsSearchResult> {
    throw new Error('Method not implemented.');
  }
  async insert(entity: AppointmentEntity): Promise<void> {
    throw new Error('Method not implemented.');
  }
  findById(id: string): Promise<AppointmentEntity> {
    throw new Error('Method not implemented.');
  }
  findAll(): Promise<AppointmentEntity[]> {
    throw new Error('Method not implemented.');
  }
  update(entity: AppointmentEntity): Promise<void> {
    throw new Error('Method not implemented.');
  }
  delete(id: string): Promise<void> {
    throw new Error('Method not implemented.');
  }
}
