/* eslint-disable @typescript-eslint/no-unused-vars */
import { PrismaClient } from '@prisma/client';
import { Test, TestingModule } from '@nestjs/testing';
import { DatabaseModule } from '@/shared/infrastructure/database/database.module';
import { NotFoundError } from '@/shared/domain/errors/not-found-error';
import { setupPrismaTests } from '@/shared/infrastructure/database/testing/setup-prisma-tests';
import { ServiceEntity } from '@/services/domain/entities/services.entity';
import { ServicesPrismaRepository } from '../../services-prisma.repository';
import { ServiceDataBuilder } from '@/services/domain/helpers/service-data-builder';
import { BarberShopDataBuilder } from '@/barberShop/domain/helpers/barberShop-data-builder';
import { BarberShopEntity } from '@/barberShop/domain/entities/barber-shop.entity';
import { UserDataBuilder } from '@/users/domain/helpers/user-data-builder';
import { Role } from '@/users/domain/entities/role.enum';
import { UserEntity } from '@/users/domain/entities/user.entity';

describe('ServicesPrismaRepository integration tests', () => {
  const prismaService = new PrismaClient();
  let sut: ServicesPrismaRepository;
  let module: TestingModule;

  beforeAll(async () => {
    setupPrismaTests();
    module = await Test.createTestingModule({
      imports: [DatabaseModule.forTest(prismaService)],
    }).compile();
  });

  beforeEach(async () => {
    sut = new ServicesPrismaRepository(prismaService as any);
    await prismaService.service.deleteMany();
    await prismaService.barberShop.deleteMany();
    await prismaService.user.deleteMany();
  });

  // Helper function to create a barber shop with owner
  const createBarberShop = async () => {
    const owner = new UserEntity(UserDataBuilder({ role: Role.barber }));
    await prismaService.user.create({
      data: owner.toJSON(),
    });

    const barberShop = new BarberShopEntity(
      BarberShopDataBuilder({
        ownerId: owner.id,
      }),
    );

    await prismaService.barberShop.create({
      data: {
        id: barberShop._id,
        name: barberShop.name,
        address: barberShop.address.toString(),
        ownerId: owner.id,
      },
    });

    return barberShop._id;
  };

  it('should throw error when entity not found', async () => {
    await expect(() => sut.findById('fake-id')).rejects.toThrow(
      new NotFoundError('ServiceModel not found using ID fake-id'),
    );
  });

  it('should find a entity by id', async () => {
    const barberShopId = await createBarberShop();
    const entity = new ServiceEntity(
      ServiceDataBuilder({
        barberShopId,
      }),
    );

    const data = {
      id: entity._id,
      name: entity.name,
      description: entity.description,
      price: entity.price,
      duration: entity.duration,
      createdAt: entity.createdAt,
      barberShopId,
    };

    const newService = await prismaService.service.create({ data });
    const output = await sut.findById(newService.id);

    expect(output.toJSON()).toEqual(
      expect.objectContaining({
        id: entity._id,
        name: entity.name,
        description: entity.description,
        price: entity.price,
        duration: entity.duration,
      }),
    );
  });

  it('should insert a new entity', async () => {
    const barberShopId = await createBarberShop();
    const entity = new ServiceEntity(
      ServiceDataBuilder({
        barberShopId,
      }),
    );

    await sut.insert(entity);

    const service = await prismaService.service.findUnique({
      where: { id: entity._id },
    });

    expect(service).not.toBeNull();
    expect(service?.name).toBe(entity.name);
    expect(service?.description).toBe(entity.description);
    expect(service?.price).toBe(entity.price);
    expect(service?.duration).toBe(entity.duration);
    expect(service?.barberShopId).toBe(barberShopId);
  });

  it('should return all services', async () => {
    const barberShopId = await createBarberShop();
    const entity = new ServiceEntity(
      ServiceDataBuilder({
        barberShopId,
      }),
    );

    await prismaService.service.create({
      data: {
        id: entity._id,
        name: entity.name,
        description: entity.description,
        price: entity.price,
        duration: entity.duration,
        createdAt: entity.createdAt,
        barberShopId,
      },
    });

    const result = await sut.findAll();
    expect(result).toHaveLength(1);
    expect(result[0].toJSON()).toEqual(
      expect.objectContaining({
        id: entity._id,
        name: entity.name,
        description: entity.description,
        price: entity.price,
        duration: entity.duration,
      }),
    );
  });

  it('should throw error on update when entity not found', async () => {
    const barberShopId = await createBarberShop();
    const entity = new ServiceEntity(
      ServiceDataBuilder({
        barberShopId,
      }),
    );

    await expect(() => sut.update(entity)).rejects.toThrow(
      new NotFoundError(`ServiceModel not found using ID ${entity._id}`),
    );
  });

  it('should update an entity', async () => {
    const barberShopId = await createBarberShop();
    const entity = new ServiceEntity(
      ServiceDataBuilder({
        barberShopId,
      }),
    );

    await prismaService.service.create({
      data: {
        id: entity._id,
        name: entity.name,
        description: entity.description,
        price: entity.price,
        duration: entity.duration,
        createdAt: entity.createdAt,
        barberShopId,
      },
    });

    entity.update('Updated Service Name');
    await sut.update(entity);

    const updated = await prismaService.service.findUnique({
      where: { id: entity._id },
    });
    expect(updated?.name).toBe('Updated Service Name');
  });

  it('should throw error on delete when entity not found', async () => {
    const barberShopId = await createBarberShop();
    const entity = new ServiceEntity(
      ServiceDataBuilder({
        barberShopId,
      }),
    );

    await expect(() => sut.delete(entity._id)).rejects.toThrow(
      new NotFoundError(`ServiceModel not found using ID ${entity._id}`),
    );
  });

  it('should delete an entity', async () => {
    const barberShopId = await createBarberShop();
    const entity = new ServiceEntity(
      ServiceDataBuilder({
        barberShopId,
      }),
    );

    await prismaService.service.create({
      data: {
        id: entity._id,
        name: entity.name,
        description: entity.description,
        price: entity.price,
        duration: entity.duration,
        createdAt: entity.createdAt,
        barberShopId,
      },
    });

    await sut.delete(entity._id);

    const deleted = await prismaService.service.findUnique({
      where: { id: entity._id },
    });
    expect(deleted).toBeNull();
  });
});
