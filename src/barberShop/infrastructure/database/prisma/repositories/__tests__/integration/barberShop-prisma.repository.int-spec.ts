/* eslint-disable @typescript-eslint/no-unused-vars */
import { PrismaClient } from '@prisma/client';
import { BarberShopPrismaRepository } from '../../barberShop-prisma.repository';
import { Test, TestingModule } from '@nestjs/testing';
import { DatabaseModule } from '@/shared/infrastructure/database/database.module';
import { NotFoundError } from '@/shared/domain/errors/not-found-error';
import { setupPrismaTests } from '@/shared/infrastructure/database/testing/setup-prisma-tests';
import { BarberShopEntity } from '@/barberShop/domain/entities/barber-shop.entity';
import { BarberShopRepository } from '@/barberShop/domain/repositories/barbershop.repository';
import { BarberShopDataBuilder } from '@/barberShop/domain/helpers/barberShop-data-builder';
import { UserDataBuilder } from '@/users/domain/helpers/user-data-builder';
import { Role } from '@/users/domain/entities/role.enum';
import { UserEntity } from '@/users/domain/entities/user.entity';

describe('BarberShopPrismaRepository integration tests', () => {
  const prismaService = new PrismaClient();
  let sut: BarberShopPrismaRepository;
  let module: TestingModule;

  beforeAll(async () => {
    setupPrismaTests();
    module = await Test.createTestingModule({
      imports: [DatabaseModule.forTest(prismaService)],
    }).compile();
  });

  beforeEach(async () => {
    sut = new BarberShopPrismaRepository(prismaService as any);
    await prismaService.barberShop.deleteMany();
    await prismaService.user.deleteMany();
  });

  // Helper function to create a user (owner)
  const createOwner = async () => {
    const data = new UserEntity(UserDataBuilder({ role: Role.barber }));
    return await prismaService.user.create({
      data: data.toJSON(),
    });
  };

  it('should throw error when entity not found', async () => {
    await expect(() => sut.findById('fake-id')).rejects.toThrow(
      new NotFoundError('BarberShop not found using ID fake-id'),
    );
  });

  it('should find a entity by id', async () => {
    const owner = await createOwner();
    const entity = new BarberShopEntity(
      BarberShopDataBuilder({
        ownerId: owner.id,
      }),
    );

    const data = {
      id: entity._id,
      name: entity.name,
      address: entity.address.toString(),
      ownerId: owner.id,
    };

    const newShop = await prismaService.barberShop.create({ data });
    const output = await sut.findById(newShop.id);

    expect(output.toJSON()).toEqual(
      expect.objectContaining({
        id: entity._id,
        name: entity.name,
        address: entity.address,
        ownerId: entity.ownerId,
      }),
    );
  });

  it('should insert a new entity and link to owner', async () => {
    const owner = await createOwner();
    const entity = new BarberShopEntity(
      BarberShopDataBuilder({
        ownerId: owner.id,
      }),
    );

    await sut.insert(entity);

    const shop = await prismaService.barberShop.findUnique({
      where: { id: entity._id },
    });

    expect(shop).not.toBeNull();
    expect(shop?.name).toBe(entity.name);
    expect(shop?.ownerId).toBe(owner.id);

    const updatedUser = await prismaService.user.findUnique({
      where: { id: owner.id },
    });
    expect(updatedUser?.barberShopId).toBe(shop?.id);
  });

  it('should return all barber shops', async () => {
    const owner = await createOwner();
    const entity = new BarberShopEntity(
      BarberShopDataBuilder({
        ownerId: owner.id,
      }),
    );

    await prismaService.barberShop.create({
      data: {
        id: entity._id,
        name: entity.name,
        address: entity.address.toString(),
        ownerId: owner.id,
      },
    });

    const result = await sut.findAll();
    expect(result).toHaveLength(1);
    expect(result[0].toJSON()).toEqual(
      expect.objectContaining({
        id: entity._id,
        name: entity.name,
        address: entity.address,
        ownerId: entity.ownerId,
      }),
    );
  });

  it('should throw error on update when entity not found', async () => {
    const owner = await createOwner();
    const entity = new BarberShopEntity(
      BarberShopDataBuilder({
        ownerId: owner.id,
      }),
    );

    await expect(() => sut.update(entity)).rejects.toThrow(
      new NotFoundError(`BarberShop not found using ID ${entity._id}`),
    );
  });

  it('should update an entity', async () => {
    const owner = await createOwner();
    const entity = new BarberShopEntity(
      BarberShopDataBuilder({
        ownerId: owner.id,
      }),
    );

    await prismaService.barberShop.create({
      data: {
        id: entity._id,
        name: entity.name,
        address: entity.address.toString(),
        ownerId: owner.id,
      },
    });

    entity.update('Updated Name', entity.address);
    await sut.update(entity);

    const updated = await prismaService.barberShop.findUnique({
      where: { id: entity._id },
    });
    expect(updated?.name).toBe('Updated Name');
  });

  it('should throw error on delete when entity not found', async () => {
    const owner = await createOwner();
    const entity = new BarberShopEntity(
      BarberShopDataBuilder({
        ownerId: owner.id,
      }),
    );

    await expect(() => sut.delete(entity._id)).rejects.toThrow(
      new NotFoundError(`BarberShop not found using ID ${entity._id}`),
    );
  });

  it('should delete an entity', async () => {
    const owner = await createOwner();
    const entity = new BarberShopEntity(
      BarberShopDataBuilder({
        ownerId: owner.id,
      }),
    );

    await prismaService.barberShop.create({
      data: {
        id: entity._id,
        name: entity.name,
        address: entity.address.toString(),
        ownerId: owner.id,
      },
    });

    await sut.delete(entity._id);

    const deleted = await prismaService.barberShop.findUnique({
      where: { id: entity._id },
    });
    expect(deleted).toBeNull();
  });

  describe('search method tests', () => {
    it('should apply only pagination when other params are null', async () => {
      const owner = await createOwner();
      const createdAt = new Date();
      const shops: BarberShopEntity[] = [];

      for (let i = 0; i < 16; i++) {
        shops.push(
          new BarberShopEntity(
            BarberShopDataBuilder({
              ownerId: owner.id,
              name: `Shop ${i}`,
            }),
          ),
        );
      }

      await prismaService.barberShop.createMany({
        data: shops.map((s) => ({
          name: s.name,
          id: s._id,
          address: s.address.toString(),
          ownerId: owner.id,
        })),
      });

      const searchOutput = await sut.search(
        new BarberShopRepository.BarberShopSearchParams(),
      );

      expect(searchOutput.total).toBe(16);
      expect(searchOutput.items.length).toBe(15);
      searchOutput.items.forEach((item) =>
        expect(item).toBeInstanceOf(BarberShopEntity),
      );
    });

    it('should search using filter, sort and paginate', async () => {
      const owner = await createOwner();
      const createdAt = new Date();
      const arrange = ['Alpha', 'Beta', 'ALPHA', 'Gamma', 'alpha'];

      const shops = arrange.map(
        (name, index) =>
          new BarberShopEntity(
            BarberShopDataBuilder({
              name,
              ownerId: owner.id,
              createdAt: new Date(createdAt.getTime() + index),
            }),
          ),
      );

      await prismaService.barberShop.createMany({
        data: shops.map((s) => ({
          id: s._id,
          name: s.name,
          address: s.address.toString(),
          ownerId: owner.id,
        })),
      });

      const searchOutput = await sut.search(
        new BarberShopRepository.BarberShopSearchParams({
          page: 1,
          perPage: 2,
          sort: 'name',
          sortDir: 'asc',
          filter: 'alpha',
        }),
      );

      expect(searchOutput.items.length).toBe(2);
      expect(searchOutput.items[0].name.toLowerCase()).toContain('alpha');
    });
  });
});
