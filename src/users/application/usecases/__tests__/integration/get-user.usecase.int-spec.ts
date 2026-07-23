/* eslint-disable @typescript-eslint/no-unused-vars */

import { DatabaseModule } from '@/shared/infrastructure/database/database.module';
import { UserPrismaRepository } from '@/users/infrastructure/database/prisma/repositories/user-prisma.repository';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import { NotFoundError } from '@/shared/domain/errors/not-found-error';
import { UserEntity } from '@/users/domain/entities/user.entity';
import { setupPrismaTests } from '@/shared/infrastructure/database/testing/setup-prisma-tests';
import { GetUserUseCase } from '../../get-user.usecase';
import { UserDataBuilder } from '@/users/domain/helpers/user-data-builder';
import { BarberShopPrismaRepository } from '@/barberShop/infrastructure/database/prisma/repositories/barberShop-prisma.repository';
import { Role } from '@/users/domain/entities/role.enum';
import { BarberShopEntity } from '@/barberShop/domain/entities/barber-shop.entity';
import { BarberShopDataBuilder } from '@/barberShop/domain/helpers/barberShop-data-builder';

describe('GetUserUseCase integration tests', () => {
  const prismaService = new PrismaClient();
  let sut: GetUserUseCase.UseCase;
  let userRepository: UserPrismaRepository;
  let barberShopRepository: BarberShopPrismaRepository;
  let module: TestingModule;

  beforeAll(async () => {
    setupPrismaTests();
    module = await Test.createTestingModule({
      imports: [DatabaseModule.forTest(prismaService)],
    }).compile();
    userRepository = new UserPrismaRepository(prismaService as any);
    barberShopRepository = new BarberShopPrismaRepository(prismaService as any);
  });

  beforeEach(async () => {
    sut = new GetUserUseCase.UseCase(userRepository, barberShopRepository);
    await prismaService.appointment.deleteMany();
    await prismaService.service.deleteMany();
    await prismaService.barberShop.deleteMany();
    await prismaService.user.deleteMany();
  });

  afterAll(async () => {
    await module.close();
  });

  it('should throws error when entity not found', async () => {
    await expect(() => sut.execute({ id: 'fakeId' })).rejects.toThrow(
      new NotFoundError('UserModel not found using ID fakeId'),
    );
  });

  it('should return a client without barber shop context', async () => {
    const entity = new UserEntity(
      UserDataBuilder({
        role: Role.client,
      }),
    );
    await prismaService.user.create({
      data: entity.toJSON(),
    });

    const output = await sut.execute({ id: entity._id });

    expect(output).toStrictEqual({
      id: entity.id,
      name: entity.name,
      email: entity.email,
      role: Role.client,
      createdAt: entity.createdAt,
      barberShop: null,
    });
    expect(output).not.toHaveProperty('password');
  });

  it('should return the barber shop owned by an owner', async () => {
    const owner = new UserEntity(UserDataBuilder({ role: Role.owner }));
    await prismaService.user.create({ data: owner.toJSON() });

    const barberShop = new BarberShopEntity(
      BarberShopDataBuilder({ ownerId: owner.id }),
    );
    await prismaService.barberShop.create({
      data: {
        id: barberShop.id,
        name: barberShop.name,
        address: barberShop.address.toString(),
        ownerId: owner.id,
        createdAt: barberShop.props.createdAt,
      },
    });

    const output = await sut.execute({ id: owner.id });

    expect(output.barberShop).toStrictEqual({
      id: barberShop.id,
      name: barberShop.name,
      address: barberShop.address.toString(),
      ownerId: owner.id,
      createdAt: barberShop.props.createdAt,
      relationship: 'owner',
    });
  });

  it('should return the barber shop linked to a barber', async () => {
    const owner = new UserEntity(UserDataBuilder({ role: Role.owner }));
    await prismaService.user.create({ data: owner.toJSON() });

    const barberShop = new BarberShopEntity(
      BarberShopDataBuilder({ ownerId: owner.id }),
    );
    await prismaService.barberShop.create({
      data: {
        id: barberShop.id,
        name: barberShop.name,
        address: barberShop.address.toString(),
        ownerId: owner.id,
        createdAt: barberShop.props.createdAt,
      },
    });

    const barber = new UserEntity(
      UserDataBuilder({
        role: Role.barber,
        barberShopId: barberShop.id,
      }),
    );
    await prismaService.user.create({ data: barber.toJSON() });

    const output = await sut.execute({ id: barber.id });

    expect(output.barberShop).toStrictEqual({
      id: barberShop.id,
      name: barberShop.name,
      address: barberShop.address.toString(),
      ownerId: owner.id,
      createdAt: barberShop.props.createdAt,
      relationship: 'barber',
    });
  });
});
