// list-barbershop.usecase.integration.spec.ts
import { BarberShopPrismaRepository } from '@/barberShop/infrastructure/database/prisma/repositories/barbershop-prisma.repository';
import { UserPrismaRepository } from '@/users/infrastructure/database/prisma/repositories/user-prisma.repository';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import { setupPrismaTests } from '@/shared/infrastructure/database/testing/setup-prisma-tests';
import { ListBarberShopUseCase } from '../../list-barbershop.usecase';
import { CreateBarberShopUseCase } from '../../create-barbershop.usecase';
import { DatabaseModule } from '@/shared/infrastructure/database/database.module';
import { Role } from '@/users/domain/entities/role.enum';
import { Address } from '@/barberShop/domain/value-objects/address.vo';
import { UserEntity } from '@/users/domain/entities/user.entity';
import { UserDataBuilder } from '@/users/domain/helpers/user-data-builder';
import { BarberShopDataBuilder } from '@/barberShop/domain/helpers/barberShop-data-builder';

describe('ListBarberShopUseCase integration tests', () => {
  const prismaService = new PrismaClient();
  let sut: ListBarberShopUseCase.UseCase;
  let createSut: CreateBarberShopUseCase.UseCase;
  let barberShopRepository: BarberShopPrismaRepository;
  let userRepository: UserPrismaRepository;
  let module: TestingModule;

  beforeAll(async () => {
    setupPrismaTests();
    module = await Test.createTestingModule({
      imports: [DatabaseModule.forTest(prismaService)],
    }).compile();
    barberShopRepository = new BarberShopPrismaRepository(prismaService as any);
    userRepository = new UserPrismaRepository(prismaService as any);
  });

  beforeEach(async () => {
    sut = new ListBarberShopUseCase.UseCase(barberShopRepository);
    createSut = new CreateBarberShopUseCase.UseCase(
      barberShopRepository,
      userRepository,
    );
    await prismaService.barberShop.deleteMany();
    await prismaService.user.deleteMany();
  });

  afterAll(async () => {
    await module.close();
  });

  it('should list all barber shops with default pagination', async () => {
    // Arrange - Create multiple users and barber shops
    const userData1 = UserDataBuilder({
      role: Role.barber,
      email: 'barber1@test.com',
    });
    const userData2 = UserDataBuilder({
      role: Role.barber,
      email: 'barber2@test.com',
    });

    const userEntity1 = new UserEntity(userData1);
    const userEntity2 = new UserEntity(userData2);

    await userRepository.insert(userEntity1);
    await userRepository.insert(userEntity2);

    const barberShopData1 = BarberShopDataBuilder({
      ownerId: userEntity1.id,
      name: 'First Barber Shop',
    });

    const barberShopData2 = BarberShopDataBuilder({
      ownerId: userEntity2.id,
      name: 'Second Barber Shop',
    });

    await createSut.execute({
      name: barberShopData1.name,
      address: barberShopData1.address,
      ownerId: userEntity1.id,
    });

    await createSut.execute({
      name: barberShopData2.name,
      address: barberShopData2.address,
      ownerId: userEntity2.id,
    });

    const input: ListBarberShopUseCase.Input = {};

    // Act
    const result = await sut.execute(input);

    // Assert
    expect(result.items).toHaveLength(2);
    expect(result.total).toBe(2);
    expect(result.currentPage).toBe(1);
    expect(result.perPage).toBe(15);
    expect(result.lastPage).toBe(1);

    expect(result.items[0]).toMatchObject({
      id: expect.any(String),
      name: expect.any(String),
      address: expect.any(String),
      ownerId: expect.any(String),
      createdAt: expect.any(Date),
    });

    expect(result.items[1]).toMatchObject({
      id: expect.any(String),
      name: expect.any(String),
      address: expect.any(String),
      ownerId: expect.any(String),
      createdAt: expect.any(Date),
    });
  });

  it('should list barber shops with custom pagination', async () => {
    // Arrange - Create multiple users and barber shops
    const users = [];
    for (let i = 1; i <= 5; i++) {
      const userData = UserDataBuilder({
        role: Role.barber,
        email: `barber${i}@test.com`,
      });
      const userEntity = new UserEntity(userData);
      await userRepository.insert(userEntity);
      users.push(userEntity);

      const barberShopData = BarberShopDataBuilder({
        ownerId: userEntity.id,
        name: `Barber Shop ${i}`,
      });

      await createSut.execute({
        name: barberShopData.name,
        address: barberShopData.address,
        ownerId: userEntity.id,
      });
    }

    const input: ListBarberShopUseCase.Input = {
      page: 2,
      perPage: 2,
    };

    // Act
    const result = await sut.execute(input);

    // Assert
    expect(result.items).toHaveLength(2);
    expect(result.total).toBe(5);
    expect(result.currentPage).toBe(2);
    expect(result.perPage).toBe(2);
    expect(result.lastPage).toBe(3);
  });

  it('should list barber shops with name filter', async () => {
    // Arrange - Create users and barber shops with different names
    const userData1 = UserDataBuilder({
      role: Role.barber,
      email: 'barber1@test.com',
    });
    const userData2 = UserDataBuilder({
      role: Role.barber,
      email: 'barber2@test.com',
    });

    const userEntity1 = new UserEntity(userData1);
    const userEntity2 = new UserEntity(userData2);

    await userRepository.insert(userEntity1);
    await userRepository.insert(userEntity2);

    const barberShopData1 = BarberShopDataBuilder({
      ownerId: userEntity1.id,
      name: 'Premium Barber Shop',
    });

    const barberShopData2 = BarberShopDataBuilder({
      ownerId: userEntity2.id,
      name: 'Classic Hair Salon',
    });

    await createSut.execute({
      name: barberShopData1.name,
      address: barberShopData1.address,
      ownerId: userEntity1.id,
    });

    await createSut.execute({
      name: barberShopData2.name,
      address: barberShopData2.address,
      ownerId: userEntity2.id,
    });

    const input: ListBarberShopUseCase.Input = {
      filter: 'Premium',
    };

    // Act
    const result = await sut.execute(input);

    // Assert
    expect(result.items).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(result.items[0].name).toBe('Premium Barber Shop');
  });

  it('should list barber shops with case insensitive filter', async () => {
    // Arrange - Create user and barber shop
    const userData = UserDataBuilder({
      role: Role.barber,
      email: 'barber@test.com',
    });
    const userEntity = new UserEntity(userData);
    await userRepository.insert(userEntity);

    const barberShopData = BarberShopDataBuilder({
      ownerId: userEntity.id,
      name: 'PREMIUM Barber Shop',
    });

    await createSut.execute({
      name: barberShopData.name,
      address: barberShopData.address,
      ownerId: userEntity.id,
    });

    const input: ListBarberShopUseCase.Input = {
      filter: 'premium',
    };

    // Act
    const result = await sut.execute(input);

    // Assert
    expect(result.items).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(result.items[0].name).toBe('PREMIUM Barber Shop');
  });

  it('should list barber shops sorted by name ascending', async () => {
    // Arrange - Create multiple users and barber shops
    const userData1 = UserDataBuilder({
      role: Role.barber,
      email: 'barber1@test.com',
    });
    const userData2 = UserDataBuilder({
      role: Role.barber,
      email: 'barber2@test.com',
    });

    const userEntity1 = new UserEntity(userData1);
    const userEntity2 = new UserEntity(userData2);

    await userRepository.insert(userEntity1);
    await userRepository.insert(userEntity2);

    // Create in reverse alphabetical order
    await createSut.execute({
      name: 'Zebra Barber Shop',
      address: new Address('Rua A, 123, São Paulo – SP'),
      ownerId: userEntity1.id,
    });

    await createSut.execute({
      name: 'Alpha Barber Shop',
      address: new Address('Rua B, 456, Rio de Janeiro – RJ'),
      ownerId: userEntity2.id,
    });

    const input: ListBarberShopUseCase.Input = {
      sort: 'name',
      sortDir: 'asc',
    };

    // Act
    const result = await sut.execute(input);

    // Assert
    expect(result.items).toHaveLength(2);
    expect(result.items[0].name).toBe('Alpha Barber Shop');
    expect(result.items[1].name).toBe('Zebra Barber Shop');
  });

  it('should list barber shops sorted by name descending', async () => {
    // Arrange - Create multiple users and barber shops
    const userData1 = UserDataBuilder({
      role: Role.barber,
      email: 'barber1@test.com',
    });
    const userData2 = UserDataBuilder({
      role: Role.barber,
      email: 'barber2@test.com',
    });

    const userEntity1 = new UserEntity(userData1);
    const userEntity2 = new UserEntity(userData2);

    await userRepository.insert(userEntity1);
    await userRepository.insert(userEntity2);

    // Create in alphabetical order
    await createSut.execute({
      name: 'Alpha Barber Shop',
      address: new Address('Rua A, 123, São Paulo – SP'),
      ownerId: userEntity1.id,
    });

    await createSut.execute({
      name: 'Zebra Barber Shop',
      address: new Address('Rua B, 456, Rio de Janeiro – RJ'),
      ownerId: userEntity2.id,
    });

    const input: ListBarberShopUseCase.Input = {
      sort: 'name',
      sortDir: 'desc',
    };

    // Act
    const result = await sut.execute(input);

    // Assert
    expect(result.items).toHaveLength(2);
    expect(result.items[0].name).toBe('Zebra Barber Shop');
    expect(result.items[1].name).toBe('Alpha Barber Shop');
  });

  it('should return empty list when no barber shops exist', async () => {
    const input: ListBarberShopUseCase.Input = {};

    // Act
    const result = await sut.execute(input);

    // Assert
    expect(result.items).toHaveLength(0);
    expect(result.total).toBe(0);
    expect(result.currentPage).toBe(1);
    expect(result.perPage).toBe(15);
  });

  it('should return empty list when filter matches no barber shops', async () => {
    // Arrange - Create user and barber shop
    const userData = UserDataBuilder({
      role: Role.barber,
      email: 'barber@test.com',
    });
    const userEntity = new UserEntity(userData);
    await userRepository.insert(userEntity);

    const barberShopData = BarberShopDataBuilder({
      ownerId: userEntity.id,
      name: 'Test Barber Shop',
    });

    await createSut.execute({
      name: barberShopData.name,
      address: barberShopData.address,
      ownerId: userEntity.id,
    });

    const input: ListBarberShopUseCase.Input = {
      filter: 'NonExistent',
    };

    // Act
    const result = await sut.execute(input);

    // Assert
    expect(result.items).toHaveLength(0);
    expect(result.total).toBe(0);
  });

  it('should handle pagination correctly when requesting page beyond last page', async () => {
    // Arrange - Create user and barber shop
    const userData = UserDataBuilder({
      role: Role.barber,
      email: 'barber@test.com',
    });
    const userEntity = new UserEntity(userData);
    await userRepository.insert(userEntity);

    const barberShopData = BarberShopDataBuilder({
      ownerId: userEntity.id,
    });

    await createSut.execute({
      name: barberShopData.name,
      address: barberShopData.address,
      ownerId: userEntity.id,
    });

    const input: ListBarberShopUseCase.Input = {
      page: 10,
      perPage: 5,
    };

    // Act
    const result = await sut.execute(input);

    // Assert
    expect(result.items).toHaveLength(0);
    expect(result.total).toBe(1);
    expect(result.currentPage).toBe(10);
    expect(result.perPage).toBe(5);
    expect(result.lastPage).toBe(1);
  });
});
