/* eslint-disable @typescript-eslint/no-unused-vars */
import { AppointmentEntity } from '@/appointments/domain/entities/appointment.entity';
import { AppointmentsRepository } from '@/appointments/domain/repositories/appointments.repository';
import { NotFoundError } from '@/shared/domain/errors/not-found-error';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { AppointmentModelMapper } from './models/appointment-model.mapper';

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
    await this.prismaService.appointment.create({
      data: entity.toJSON(),
    });
  }
  findById(id: string): Promise<AppointmentEntity> {
    return this._get(id);
  }
  async findAll(): Promise<AppointmentEntity[]> {
    const models = await this.prismaService.appointment.findMany();
    return models.map((model) => AppointmentModelMapper.toEntity(model));
  }
  async update(entity: AppointmentEntity): Promise<void> {
    await this._get(entity.id);
    await this.prismaService.appointment.update({
      data: entity.toJSON(),
      where: { id: entity.id },
    });
  }
  async delete(id: string): Promise<void> {
    await this._get(id);
    await this.prismaService.appointment.delete({
      where: { id },
    });
  }

  protected async _get(id: string): Promise<AppointmentEntity> {
    try {
      const appointment = await this.prismaService.appointment.findUnique({
        where: { id },
      });
      return;
    } catch {
      throw new NotFoundError(`AppointmentModel not found using id ${id}`);
    }
  }
}
