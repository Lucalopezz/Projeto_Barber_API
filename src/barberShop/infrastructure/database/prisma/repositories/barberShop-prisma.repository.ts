/* eslint-disable @typescript-eslint/no-unused-vars */
import { BarberShopEntity } from '@/barberShop/domain/entities/barber-shop.entity';
import { BarberShopRepository } from '@/barberShop/domain/repositories/barbershop.repository';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { BarberShopModelMapper } from './models/barberShop-model.mapper';
import { NotFoundError } from '@/shared/domain/errors/not-found-error';

export class BarberShopPrismaRepository
  implements BarberShopRepository.Repository
{
  constructor(private prismaService: PrismaService) {}

  sortableFields: string[] = ['name', 'createdAt'];

  async findByOwnerId(ownerId: string): Promise<BarberShopEntity | null> {
    const ownerShop = await this.prismaService.barberShop.findUnique({
      where: { ownerId },
    });

    if (!ownerShop) {
      return null;
    }

    return BarberShopModelMapper.toEntity(ownerShop);
  }

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
      where: props.filter
        ? {
            name: {
              contains: props.filter,
              mode: 'insensitive',
            },
          }
        : {},

      orderBy: {
        [orderByField]: orderByDir,
      },

      skip: props.page && props.page > 0 ? (props.page - 1) * props.perPage : 0,

      take: props.perPage && props.perPage > 0 ? props.perPage : 15,
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
  async insert(entity: BarberShopEntity): Promise<void> {
    const data = {
      id: entity._id,
      name: entity.name,
      address: entity.address.toString(),
      ownerId: entity.ownerId,
    };

    await this.prismaService.$transaction(async (tx) => {
      const shop = await tx.barberShop.create({ data });
      await tx.user.update({
        where: { id: data.ownerId },
        data: { barberShopId: shop.id },
      });
    });
  }
  findById(id: string): Promise<BarberShopEntity> {
    return this._get(id);
  }
  async findAll(): Promise<BarberShopEntity[]> {
    const models = await this.prismaService.barberShop.findMany();
    return models.map((model) => BarberShopModelMapper.toEntity(model));
  }
  async update(entity: BarberShopEntity): Promise<void> {
    const data = {
      name: entity.name,
      address: entity.address.toString(),
    };
    await this._get(entity._id);
    await this.prismaService.barberShop.update({
      data: data,
      where: {
        id: entity._id,
      },
    });
  }
  async delete(id: string): Promise<void> {
    await this._get(id);
    await this.prismaService.barberShop.delete({
      where: {
        id,
      },
    });
  }
  protected async _get(id: string): Promise<BarberShopEntity> {
    try {
      const shop = await this.prismaService.barberShop.findUnique({
        where: {
          id,
        },
      });
      return BarberShopModelMapper.toEntity(shop);
    } catch {
      throw new NotFoundError(`BarberShop not found using ID ${id}`);
    }
  }
}
