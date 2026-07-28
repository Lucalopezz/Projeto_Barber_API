/* eslint-disable @typescript-eslint/no-unused-vars */
import { AppointmentEntity } from '@/appointments/domain/entities/appointment.entity';
import { AppointmentsRepository } from '@/appointments/domain/repositories/appointments.repository';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { AppointmentModelMapper } from './models/appointment-model.mapper';
import { Prisma } from '@prisma/client';
import { ConflictError } from '@/shared/domain/errors/conflict-error';

export class AppointmentsPrismaRepository
  implements AppointmentsRepository.Repository
{
  constructor(
    private prismaService: PrismaService | Prisma.TransactionClient,
  ) {}
  sortableFields: string[] = ['date', 'createdAt', 'serviceId'];

  /**
   * Finds an overlapping scheduled appointment for a given barber within a specified time range.
   */
  async findOverlappingScheduled(
    startsAt: Date,
    endsAt: Date,
    barberId: string,
    excludeAppointmentId?: string,
  ): Promise<AppointmentEntity | null> {
    const appointment = await this.prismaService.appointment.findFirst({
      where: {
        status: 'scheduled',
        barberId,
        date: { lt: endsAt },
        endDate: { gt: startsAt },
        ...(excludeAppointmentId && { id: { not: excludeAppointmentId } }),
      },
    });
    return appointment ? AppointmentModelMapper.toEntity(appointment) : null;
  }

  async search(
    props: AppointmentsRepository.AppointmentsSearchParams,
  ): Promise<AppointmentsRepository.AppointmentsSearchResult> {
    const sortable = this.sortableFields?.includes(props.sort) ?? false;

    const orderByField = sortable ? props.sort : 'createdAt';
    const orderByDir = sortable && props.sortDir ? props.sortDir : 'desc';

    const filter = props.filter as AppointmentsRepository.Filter | undefined;

    const clauses: Prisma.AppointmentWhereInput[] = [];

    if (filter?.serviceId) {
      clauses.push({
        serviceId: filter.serviceId,
      });
    }

    if (filter?.dateFrom || filter?.dateTo) {
      // gte = greater than or equal, lte = less than or equal
      clauses.push({
        date: {
          ...(filter.dateFrom && { gte: filter.dateFrom }),
          ...(filter.dateTo && { lte: filter.dateTo }),
        },
      });
    }

    if (filter?.barberShopId) {
      clauses.push({
        barberShopId: filter.barberShopId,
      });
    }

    if (filter?.barberShopOwnerId) {
      clauses.push({
        service: {
          barberShop: {
            ownerId: filter.barberShopOwnerId,
          },
        },
      });
    } else if (filter?.barberId) {
      clauses.push({
        barberId: filter.barberId,
      });
    } else if (filter?.customerId) {
      clauses.push({
        clientId: filter.customerId,
      });
    }

    const where: Prisma.AppointmentWhereInput =
      clauses.length > 0 ? { AND: clauses } : {};

    const count = await this.prismaService.appointment.count({ where });

    const models = await this.prismaService.appointment.findMany({
      where,
      orderBy: {
        [orderByField]: orderByDir,
      },
      skip: props.page && props.page > 0 ? (props.page - 1) * props.perPage : 0,
      take: props.perPage && props.perPage > 0 ? props.perPage : 10,
    });

    return new AppointmentsRepository.AppointmentsSearchResult({
      items: models.map((model) => AppointmentModelMapper.toEntity(model)),
      total: count,
      currentPage: props.page,
      perPage: props.perPage,
      sort: orderByField,
      sortDir: orderByDir,
      filter: props.filter,
    });
  }
  async insert(entity: AppointmentEntity): Promise<void> {
    try {
      await this.prismaService.appointment.create({
        data: entity.toJSON(),
      });
    } catch (error) {
      if (this.isAvailabilityConflict(error)) {
        throw new ConflictError('Appointment not available');
      }
      throw error;
    }
  }
  findById(id: string): Promise<AppointmentEntity | null> {
    return this._get(id);
  }
  async findAll(): Promise<AppointmentEntity[]> {
    const models = await this.prismaService.appointment.findMany();
    return models.map((model) => AppointmentModelMapper.toEntity(model));
  }
  async update(entity: AppointmentEntity): Promise<void> {
    try {
      await this.prismaService.appointment.update({
        data: entity.toJSON(),
        where: { id: entity.id },
      });
    } catch (error) {
      if (this.isAvailabilityConflict(error)) {
        throw new ConflictError('Appointment not available');
      }
      throw error;
    }
  }
  async delete(id: string): Promise<void> {
    await this.prismaService.appointment.delete({
      where: { id },
    });
  }

  protected async _get(id: string): Promise<AppointmentEntity | null> {
    const appointment = await this.prismaService.appointment.findUnique({
      where: { id },
    });
    return appointment ? AppointmentModelMapper.toEntity(appointment) : null;
  }

  private isAvailabilityConflict(error: unknown): boolean {
    return (
      (error instanceof Prisma.PrismaClientKnownRequestError ||
        error instanceof Prisma.PrismaClientUnknownRequestError) &&
      error.message.includes('Appointment_no_overlapping_scheduled')
    );
  }
}
