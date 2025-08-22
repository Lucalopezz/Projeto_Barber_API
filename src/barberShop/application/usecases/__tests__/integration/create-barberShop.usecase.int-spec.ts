import { BarberShopPrismaRepository } from '@/barberShop/infrastructure/database/prisma/repositories/barbershop-prisma.repository';
import { UserPrismaRepository } from '@/users/infrastructure/database/prisma/repositories/user-prisma.repository';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import { setupPrismaTests } from '@/shared/infrastructure/database/testing/setup-prisma-tests';
import { CreateBarberShopUseCase } from '../../create-barbershop.usecase';
import { DatabaseModule } from '@/shared/infrastructure/database/database.module';
import { Role } from '@/users/domain/entities/role.enum';
import { Address } from '@/barberShop/domain/value-objects/address.vo';
import { UserEntity } from '@/users/domain/entities/user.entity';
import { BadRequestError } from '@/shared/application/errors/bad-request-error';
import { UserDataBuilder } from '@/users/domain/helpers/user-data-builder';
import { BarberShopDataBuilder } from '@/barberShop/domain/helpers/barberShop-data-builder';

describe('CreateBarberShopUseCase integration tests', () => {
  const prismaService = new PrismaClient();
  let sut: CreateBarberShopUseCase.UseCase;
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
    sut = new CreateBarberShopUseCase.UseCase(
      barberShopRepository,
      userRepository,
    );
    await prismaService.barberShop.deleteMany();
    await prismaService.user.deleteMany();
  });

  afterAll(async () => {
    await module.close();
  });

  it('should create a barber shop successfully', async () => {
    // Arrange - Create a barber user first
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

    const input: CreateBarberShopUseCase.Input = {
      name: barberShopData.name,
      address: barberShopData.address,
      ownerId: userEntity.id,
    };

    // Act
    const output = await sut.execute(input);

    // Assert
    expect(output.id).toBeDefined();
    expect(output.name).toBe(barberShopData.name);
    expect(output.address).toBe(barberShopData.address.toString());
    expect(output.ownerId).toBe(userEntity.id);
    expect(output.createdAt).toBeInstanceOf(Date);
  });

  it('should throw BadRequestError when user already has a barber shop', async () => {
    // Arrange - Create a barber user
    const userData = UserDataBuilder({
      role: Role.barber,
      email: 'barber@test.com',
    });
    const userEntity = new UserEntity(userData);
    await userRepository.insert(userEntity);

    // Create first barber shop
    const firstBarberShopData = BarberShopDataBuilder({
      ownerId: userEntity.id,
      name: 'First Barber Shop',
    });

    const firstInput: CreateBarberShopUseCase.Input = {
      name: firstBarberShopData.name,
      address: firstBarberShopData.address,
      ownerId: userEntity.id,
    };

    await sut.execute(firstInput);

    // Try to create second barber shop for same user
    const secondBarberShopData = BarberShopDataBuilder({
      ownerId: userEntity.id,
      name: 'Second Barber Shop',
    });

    const secondInput: CreateBarberShopUseCase.Input = {
      name: secondBarberShopData.name,
      address: secondBarberShopData.address,
      ownerId: userEntity.id,
    };

    // Act & Assert
    await expect(sut.execute(secondInput)).rejects.toThrow(
      new BadRequestError('BarberShop already exists for this user'),
    );
  });

  it('should throw BadRequestError when user role is not barber', async () => {
    // Arrange - Create a user with role different from barber
    const userData = UserDataBuilder({
      role: Role.client,
      email: 'client@test.com',
    });
    const userEntity = new UserEntity(userData);
    await userRepository.insert(userEntity);

    const barberShopData = BarberShopDataBuilder({
      ownerId: userEntity.id,
      name: 'Test Barber Shop',
    });

    const input: CreateBarberShopUseCase.Input = {
      name: barberShopData.name,
      address: barberShopData.address,
      ownerId: userEntity.id,
    };

    // Act & Assert
    await expect(sut.execute(input)).rejects.toThrow(
      new BadRequestError(
        'Only users with role barber can create a BarberShop',
      ),
    );
  });

  it('should create barber shop with custom address', async () => {
    // Arrange - Create a barber user
    const userData = UserDataBuilder({
      role: Role.barber,
      email: 'barber@test.com',
    });
    const userEntity = new UserEntity(userData);
    await userRepository.insert(userEntity);

    const customAddress = new Address('Rua das Flores, 123, São Paulo – SP');

    const input: CreateBarberShopUseCase.Input = {
      name: 'Custom Address Barber Shop',
      address: customAddress,
      ownerId: userEntity.id,
    };

    // Act
    const output = await sut.execute(input);

    // Assert
    expect(output.id).toBeDefined();
    expect(output.name).toBe('Custom Address Barber Shop');
    expect(output.address).toBe('Rua das Flores, 123, São Paulo – SP');
    expect(output.ownerId).toBe(userEntity.id);
    expect(output.createdAt).toBeInstanceOf(Date);
  });

  it('should create barber shop and update user with barberShopId', async () => {
    // Arrange - Create a barber user
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

    const input: CreateBarberShopUseCase.Input = {
      name: barberShopData.name,
      address: barberShopData.address,
      ownerId: userEntity.id,
    };

    // Act
    const output = await sut.execute(input);

    // Assert
    const updatedUser = await prismaService.user.findUnique({
      where: { id: userEntity.id },
    });

    expect(updatedUser.barberShopId).toBe(output.id);
  });
});
