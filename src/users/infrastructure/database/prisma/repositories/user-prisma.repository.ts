/* eslint-disable @typescript-eslint/no-unused-vars */
import { ConflictError } from '@/shared/domain/errors/conflict-error';
import { NotFoundError } from '@/shared/domain/errors/not-found-error';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { UserEntity } from '@/users/domain/entities/user.entity';
import { UserRepository } from '@/users/domain/repositories/user.repository';
import { UserModelMapper } from './models/user-model.mapper';
import { Role } from '@prisma/client';

export class UserPrismaRepository implements UserRepository.Repository {
  constructor(private prismaService: PrismaService) {}

  sortableFields: string[] = ['name', 'role', 'createdAt'];

  async findByEmail(email: string): Promise<UserEntity> {
    try {
      const user = await this.prismaService.user.findUnique({
        where: {
          email,
        },
      });
      return UserModelMapper.toEntity(user);
    } catch {
      throw new NotFoundError(`UserModel not found using email ${email}`);
    }
  }

  async emailExists(email: string): Promise<void> {
    const user = await this.prismaService.user.findUnique({
      where: {
        email,
      },
    });
    if (user) {
      throw new ConflictError('Email address already used');
    }
  }

  async search(
    props: UserRepository.UserSearchParams,
  ): Promise<UserRepository.UserSearchResult> {
    const sortable = this.sortableFields?.includes(props.sort) || false;
    const orderByField = sortable ? props.sort : 'createdAt';
    const orderByDir = sortable ? props.sortDir : 'desc';

    // when the valeu is not a valid role
    const isValidRole = Object.values(Role).includes(props.filter as Role);

    let where = {};
    // Search in either name OR role fields (if role filter is valid)
    if (props.filter) {
      where = {
        OR: [
          { name: { contains: props.filter, mode: 'insensitive' } },
          ...(isValidRole ? [{ role: { equals: props.filter } }] : []),
        ],
      };
    }

    // Get total count of matching records (for pagination)
    const count = await this.prismaService.user.count({ where });

    const models = await this.prismaService.user.findMany({
      where, // Apply the constructed filters
      orderBy: { [orderByField]: orderByDir },
      skip: props.page && props.page > 0 ? (props.page - 1) * props.perPage : 0,
      take: props.perPage && props.perPage > 0 ? props.perPage : 15,
    });

    return new UserRepository.UserSearchResult({
      items: models.map((model) => UserModelMapper.toEntity(model)),
      total: count,
      currentPage: props.page,
      perPage: props.perPage,
      sort: orderByField,
      sortDir: orderByDir,
      filter: props.filter,
    });
  }

  async insert(entity: UserEntity): Promise<void> {
    await this.prismaService.user.create({
      data: entity.toJSON(),
    });
  }

  findById(id: string): Promise<UserEntity> {
    return this._get(id);
  }

  async findAll(): Promise<UserEntity[]> {
    const models = await this.prismaService.user.findMany();
    return models.map((model) => UserModelMapper.toEntity(model));
  }

  async update(entity: UserEntity): Promise<void> {
    await this._get(entity._id);
    await this.prismaService.user.update({
      data: entity.toJSON(),
      where: {
        id: entity._id,
      },
    });
  }

  async delete(id: string): Promise<void> {
    await this._get(id);
    await this.prismaService.user.delete({
      where: {
        id,
      },
    });
  }
  protected async _get(id: string): Promise<UserEntity> {
    try {
      const user = await this.prismaService.user.findUnique({
        where: {
          id,
        },
      });
      return UserModelMapper.toEntity(user);
    } catch {
      throw new NotFoundError(`UserModel not found using ID ${id}`);
    }
  }
}
