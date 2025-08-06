/* eslint-disable @typescript-eslint/no-unused-vars */
import { BarberShopEntity } from '@/barberShop/domain/entities/barber-shop.entity';
import { BarberShopRepository } from '@/barberShop/domain/repositories/barbershop.repository';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { BarberShopModelMapper } from './models/barberShop-model.mapper';

export class BarberShopPrismaRepository
  implements BarberShopRepository.Repository
{
  constructor(private prismaService: PrismaService) {}
  sortableFields: string[] = ['name', 'createdAt'];

  async search(
    props: BarberShopRepository.BarberShopSearchParams,
  ): Promise<BarberShopRepository.BarberShopSearchResult> {
    const sortable = this.sortableFields?.includes(props.sort) || false;
    const orderByField = sortable ? props.sort : 'createdAt';
    const orderByDir = sortable ? props.sortDir : 'desc';

    const count = await this.prismaService.barberShop.count({
      ...(props.filter && {
        where: {
          name: {
            contains: props.filter,
            mode: 'insensitive',
          },
        },
      }),
    });
    const models = await this.prismaService.barberShop.findMany({
      ...(props.filter && {
        where: {
          name: {
            contains: props.filter,
            mode: 'insensitive',
          },
        },
        orderBy: {
          [orderByField]: orderByDir,
        },
        skip: props.page && props.page > 0 ? (props.page - 1) * props.page : 1,
        take: props.perPage && props.perPage > 0 ? props.perPage : 15,
      }),
    });

    return new BarberShopRepository.BarberShopSearchResult({
      items: models.map((m) => BarberShopModelMapper.toEntity(m)),
      total: count,
      currentPage: props.page,
      perPage: props.perPage,
      sort: orderByField,
      sortDir: orderByDir,
      filter: props.filter,
    });
  }
  insert(entity: BarberShopEntity): Promise<void> {
    throw new Error('Method not implemented.');
  }
  findById(id: string): Promise<BarberShopEntity> {
    throw new Error('Method not implemented.');
  }
  findAll(): Promise<BarberShopEntity[]> {
    throw new Error('Method not implemented.');
  }
  update(entity: BarberShopEntity): Promise<void> {
    throw new Error('Method not implemented.');
  }
  delete(id: string): Promise<void> {
    throw new Error('Method not implemented.');
  }
}
