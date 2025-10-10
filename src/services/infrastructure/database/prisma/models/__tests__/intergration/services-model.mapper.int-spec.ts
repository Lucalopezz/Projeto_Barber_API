import { PrismaClient, Service } from '@prisma/client';

import { ValidationError } from '@/shared/domain/errors/validation-error';
import { UserEntity } from '@/users/domain/entities/user.entity';
import { setupPrismaTests } from '@/shared/infrastructure/database/testing/setup-prisma-tests';
import { ServicesModelMapper } from '../../services-model.mapper';
import { BarberShopEntity } from '@/barberShop/domain/entities/barber-shop.entity';
import { BarberShopDataBuilder } from '@/barberShop/domain/helpers/barberShop-data-builder';
import { UserDataBuilder } from '@/users/domain/helpers/user-data-builder';
import { Role } from '@/users/domain/entities/role.enum';
import { ServiceEntity } from '@/services/domain/entities/services.entity';

describe('ServiceModelMapper integration tests', () => {
  let prismaService: PrismaClient;
  let props: any;

  beforeAll(async () => {
    setupPrismaTests();
    prismaService = new PrismaClient();
    await prismaService.$connect();
  });

  beforeEach(async () => {
    await prismaService.service.deleteMany();
    await prismaService.barberShop.deleteMany();
    await prismaService.user.deleteMany();

    props = {
      id: 'd4255494-f981-4d26-a2a1-35d3f5b8d36a',
      name: 'Test name',
      price: 100.0,
      duration: 110,
      description: 'Test description',
      barberShopId: 'd4255494-f981-4d26-a2a1-35d3f5b8d36a',
      createdAt: new Date(),
    };
  });

  afterAll(async () => {
    await prismaService.$disconnect();
  });

  it('should throw error when service model is invalid', async () => {
    const model: Service = Object.assign({}, props, { name: null });
    expect(() => ServicesModelMapper.toEntity(model)).toThrowError(
      ValidationError,
    );
  });

  // Helper function to create a user (owner)
  const createOwner = async () => {
    const data = new UserEntity(UserDataBuilder({ role: Role.barber }));
    return prismaService.user.create({ data: data.toJSON() });
  };

  it('should convert a service model to a service entity', async () => {
    const owner = await createOwner();

    const barberShop = new BarberShopEntity(
      BarberShopDataBuilder({
        ownerId: owner.id,
      }),
    );

    await prismaService.barberShop.create({
      data: {
        id: props.barberShopId,
        name: barberShop.name,
        address: barberShop.address.toString(),
        ownerId: owner.id,
      },
    });

    const model: Service = await prismaService.service.create({
      data: props,
    });

    const sut = ServicesModelMapper.toEntity(model);

    expect(sut).toBeInstanceOf(ServiceEntity);
    expect(sut.toJSON()).toEqual(
      expect.objectContaining({
        id: props.id,
        name: props.name,
        price: props.price,
        duration: props.duration,
        description: props.description,
        barberShopId: props.barberShopId,
      }),
    );
  });
});
