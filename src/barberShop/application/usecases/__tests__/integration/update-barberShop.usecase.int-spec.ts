import { BarberShopPrismaRepository } from '@/barberShop/infrastructure/database/prisma/repositories/barbershop-prisma.repository';
import { UserPrismaRepository } from '@/users/infrastructure/database/prisma/repositories/user-prisma.repository';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import { setupPrismaTests } from '@/shared/infrastructure/database/testing/setup-prisma-tests';
import { UpdateBarberShopUseCase } from '../../update-barbershop.usecase';
import { CreateBarberShopUseCase } from '../../create-barbershop.usecase';
import { DatabaseModule } from '@/shared/infrastructure/database/database.module';
import { Role } from '@/users/domain/entities/role.enum';
import { Address } from '@/barberShop/domain/value-objects/address.vo';
import { UserEntity } from '@/users/domain/entities/user.entity';
import { BadRequestError } from '@/shared/application/errors/bad-request-error';
import { UserDataBuilder } from '@/users/domain/helpers/user-data-builder';
import { BarberShopDataBuilder } from '@/barberShop/domain/helpers/barberShop-data-builder';

describe('UpdateBarberShopUseCase integration tests', () => {
  const prismaService = new PrismaClient();
  let sut: UpdateBarberShopUseCase.UseCase;
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
    sut = new UpdateBarberShopUseCase.UseCase(barberShopRepository);
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

  it('should update barber shop name successfully', async () => {
    // Arrange - Create user and barber shop
    const userData = UserDataBuilder({
      role: Role.barber,
      email: 'barber@test.com',
    });
    const userEntity = new UserEntity(userData);
    await userRepository.insert(userEntity);

    const barberShopData = BarberShopDataBuilder({
      ownerId: userEntity.id,
      name: 'Original Name',
    });

    const createInput: CreateBarberShopUseCase.Input = {
      name: barberShopData.name,
      address: barberShopData.address,
      ownerId: userEntity.id,
    };

    const createdBarberShop = await createSut.execute(createInput);

    const updateInput: UpdateBarberShopUseCase.Input = {
      id: createdBarberShop.id,
      name: 'Updated Name',
      ownerId: userEntity.id,
    };

    // Act
    const result = await sut.execute(updateInput);

    // Assert
    expect(result.id).toBe(createdBarberShop.id);
    expect(result.name).toBe('Updated Name');
    expect(result.address).toBe(barberShopData.address.toString());
    expect(result.ownerId).toBe(userEntity.id);
    expect(result.createdAt).toBeInstanceOf(Date);
  });

  it('should update barber shop address successfully', async () => {
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

    const createInput: CreateBarberShopUseCase.Input = {
      name: barberShopData.name,
      address: barberShopData.address,
      ownerId: userEntity.id,
    };

    const createdBarberShop = await createSut.execute(createInput);

    const newAddress = new Address('Rua Nova, 456, Rio de Janeiro – RJ');
    const updateInput: UpdateBarberShopUseCase.Input = {
      id: createdBarberShop.id,
      address: newAddress,
      ownerId: userEntity.id,
    };

    // Act
    const result = await sut.execute(updateInput);

    // Assert
    expect(result.id).toBe(createdBarberShop.id);
    expect(result.name).toBe(barberShopData.name);
    expect(result.address).toBe('Rua Nova, 456, Rio de Janeiro – RJ');
    expect(result.ownerId).toBe(userEntity.id);
    expect(result.createdAt).toBeInstanceOf(Date);
  });

  it('should update both name and address successfully', async () => {
    // Arrange - Create user and barber shop
    const userData = UserDataBuilder({
      role: Role.barber,
      email: 'barber@test.com',
    });
    const userEntity = new UserEntity(userData);
    await userRepository.insert(userEntity);

    const barberShopData = BarberShopDataBuilder({
      ownerId: userEntity.id,
      name: 'Original Name',
    });

    const createInput: CreateBarberShopUseCase.Input = {
      name: barberShopData.name,
      address: barberShopData.address,
      ownerId: userEntity.id,
    };

    const createdBarberShop = await createSut.execute(createInput);

    const newAddress = new Address('Rua Nova, 456, Rio de Janeiro – RJ');
    const updateInput: UpdateBarberShopUseCase.Input = {
      id: createdBarberShop.id,
      name: 'Updated Name',
      address: newAddress,
      ownerId: userEntity.id,
    };

    // Act
    const result = await sut.execute(updateInput);

    // Assert
    expect(result.id).toBe(createdBarberShop.id);
    expect(result.name).toBe('Updated Name');
    expect(result.address).toBe('Rua Nova, 456, Rio de Janeiro – RJ');
    expect(result.ownerId).toBe(userEntity.id);
    expect(result.createdAt).toBeInstanceOf(Date);
  });

  it('should throw BadRequestError when neither name nor address is provided', async () => {
    const updateInput: UpdateBarberShopUseCase.Input = {
      id: 'some-id',
      ownerId: 'some-owner-id',
    };

    await expect(sut.execute(updateInput)).rejects.toThrow(
      new BadRequestError('Name and Address not provided'),
    );
  });

  it('should throw BadRequestError when barber shop is not found for owner', async () => {
    const updateInput: UpdateBarberShopUseCase.Input = {
      id: 'non-existent-id',
      name: 'New Name',
      ownerId: 'non-existent-owner',
    };

    await expect(sut.execute(updateInput)).rejects.toThrow(
      new BadRequestError('Barber shop not found for the given owner'),
    );
  });

  it('should throw BadRequestError when barber shop id does not match', async () => {
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

    const createInput: CreateBarberShopUseCase.Input = {
      name: barberShopData.name,
      address: barberShopData.address,
      ownerId: userEntity.id,
    };

    await createSut.execute(createInput);

    const updateInput: UpdateBarberShopUseCase.Input = {
      id: 'wrong-id',
      name: 'Updated Name',
      ownerId: userEntity.id,
    };

    // Act & Assert
    await expect(sut.execute(updateInput)).rejects.toThrow(
      new BadRequestError('Barber shop not found for the given owner'),
    );
  });
});
