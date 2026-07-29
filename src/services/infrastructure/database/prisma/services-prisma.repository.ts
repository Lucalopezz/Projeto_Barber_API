import { ServiceEntity } from '@/services/domain/entities/services.entity';
import { ServicesRepository } from '@/services/domain/repositories/services.repository';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { ServicesModelMapper } from './models/services-model.mapper';
import { Prisma } from '@prisma/client';

export class ServicesPrismaRepository implements ServicesRepository.Repository {
  constructor(
    private prismaService: PrismaService | Prisma.TransactionClient,
  ) {}

  sortableFields: string[] = ['name', 'price', 'duration', 'createdAt'];

  async search(
    props: ServicesRepository.ServicesSearchParams,
  ): Promise<ServicesRepository.ServicesSearchResult> {
    const sortable = this.sortableFields.includes(props.sort);
    const orderByField = sortable ? props.sort : 'createdAt';
    const orderByDir = sortable && props.sortDir ? props.sortDir : 'desc';

    const filter = props.filter as ServicesRepository.Filter | undefined;
    const where: Prisma.ServiceWhereInput = filter?.barberShopId
      ? { barberShopId: filter.barberShopId }
      : {};

    const count = await this.prismaService.service.count({ where });
    const models = await this.prismaService.service.findMany({
      where,
      orderBy: { [orderByField]: orderByDir },
      skip: (props.page - 1) * props.perPage,
      take: props.perPage,
    });

    return new ServicesRepository.ServicesSearchResult({
      items: models.map((model) => ServicesModelMapper.toEntity(model)),
      total: count,
      currentPage: props.page,
      perPage: props.perPage,
      sort: orderByField,
      sortDir: orderByDir,
      filter: props.filter,
    });
  }

  async insert(entity: ServiceEntity): Promise<void> {
    await this.prismaService.service.create({
      data: entity.toJSON(),
    });
    return;
  }
  findById(id: string): Promise<ServiceEntity | null> {
    return this._get(id);
  }
  async findAll(): Promise<ServiceEntity[]> {
    const services = await this.prismaService.service.findMany();
    return services.map((service) => ServicesModelMapper.toEntity(service));
  }
  async update(entity: ServiceEntity): Promise<void> {
    await this.prismaService.service.update({
      data: entity.toJSON(),
      where: {
        id: entity._id,
      },
    });
  }
  async delete(id: string): Promise<void> {
    await this.prismaService.service.delete({
      where: { id },
    });
  }

  protected async _get(id: string): Promise<ServiceEntity | null> {
    const service = await this.prismaService.service.findUnique({
      where: { id },
    });
    return service ? ServicesModelMapper.toEntity(service) : null;
  }
}
