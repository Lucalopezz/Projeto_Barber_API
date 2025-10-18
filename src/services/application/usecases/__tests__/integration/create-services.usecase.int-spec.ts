import { BarberShopPrismaRepository } from '@/barberShop/infrastructure/database/prisma/repositories/barbershop-prisma.repository';
import { UserPrismaRepository } from '@/users/infrastructure/database/prisma/repositories/user-prisma.repository';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import { setupPrismaTests } from '@/shared/infrastructure/database/testing/setup-prisma-tests';
import { CreateServicesUseCase } from '../../create-services.usecase';
import { CreateBarberShopUseCase } from '@/barberShop/application/usecases/create-barbershop.usecase';
import { DatabaseModule } from '@/shared/infrastructure/database/database.module';
import { Role } from '@/users/domain/entities/role.enum';
import { UserEntity } from '@/users/domain/entities/user.entity';
import { BadRequestError } from '@/shared/application/errors/bad-request-error';
import { UserDataBuilder } from '@/users/domain/helpers/user-data-builder';
import { BarberShopDataBuilder } from '@/barberShop/domain/helpers/barberShop-data-builder';
import { ServiceDataBuilder } from '@/services/domain/helpers/service-data-builder';
import { ServicesPrismaRepository } from '@/services/infrastructure/database/prisma/services-prisma.repository';

describe('CreateServicesUseCase integration tests', () => {
  const prismaService = new PrismaClient();
  let sut: CreateServicesUseCase.UseCase;
  let createBarberShopSut: CreateBarberShopUseCase.UseCase;
  let servicesRepository: ServicesPrismaRepository;
  let barberShopRepository: BarberShopPrismaRepository;
  let userRepository: UserPrismaRepository;
  let module: TestingModule;

  beforeAll(async () => {
    setupPrismaTests();
    module = await Test.createTestingModule({
      imports: [DatabaseModule.forTest(prismaService)],
    }).compile();
    servicesRepository = new ServicesPrismaRepository(prismaService as any);
    barberShopRepository = new BarberShopPrismaRepository(prismaService as any);
    userRepository = new UserPrismaRepository(prismaService as any);
  });

  beforeEach(async () => {
    sut = new CreateServicesUseCase.UseCase(
      servicesRepository,
      barberShopRepository,
    );
    createBarberShopSut = new CreateBarberShopUseCase.UseCase(
      barberShopRepository,
      userRepository,
    );
    await prismaService.service.deleteMany();
    await prismaService.barberShop.deleteMany();
    await prismaService.user.deleteMany();
  });

  afterAll(async () => {
    await module.close();
  });

  it('should create a service successfully', async () => {
    // Arrange - Create barber user and barber shop
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

    const createBarberShopInput: CreateBarberShopUseCase.Input = {
      name: barberShopData.name,
      address: barberShopData.address,
      ownerId: userEntity.id,
    };

    const createdBarberShop = await createBarberShopSut.execute(
      createBarberShopInput,
    );

    const serviceData = ServiceDataBuilder({
      name: 'Corte de Cabelo',
      price: 50,
      description: 'Corte de cabelo tradicional',
      duration: 30,
    });

    const input: CreateServicesUseCase.Input = {
      name: serviceData.name,
      price: serviceData.price,
      description: serviceData.description,
      duration: serviceData.duration,
      barberShopOwnerId: userEntity.id,
    };

    // Act
    const output = await sut.execute(input);

    // Assert
    expect(output.id).toBeDefined();
    expect(output.name).toBe(serviceData.name);
    expect(output.price).toBe(serviceData.price);
    expect(output.description).toBe(serviceData.description);
    expect(output.duration).toBe(serviceData.duration);
    expect(output.barberShopId).toBe(createdBarberShop.id);
    expect(output.createdAt).toBeInstanceOf(Date);
  });

  it('should throw BadRequestError when barber shop is not found', async () => {
    // Arrange
    const serviceData = ServiceDataBuilder({
      name: 'Corte de Cabelo',
      price: 50,
      description: 'Corte de cabelo tradicional',
      duration: 30,
    });

    const input: CreateServicesUseCase.Input = {
      name: serviceData.name,
      price: serviceData.price,
      description: serviceData.description,
      duration: serviceData.duration,
      barberShopOwnerId: 'non-existent-owner-id',
    };

    // Act & Assert
    await expect(sut.execute(input)).rejects.toThrow(
      new BadRequestError('BarberShop not found'),
    );
  });

  it('should create service with custom price and duration', async () => {
    // Arrange - Create barber user and barber shop
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

    const createBarberShopInput: CreateBarberShopUseCase.Input = {
      name: barberShopData.name,
      address: barberShopData.address,
      ownerId: userEntity.id,
    };

    await createBarberShopSut.execute(createBarberShopInput);

    const input: CreateServicesUseCase.Input = {
      name: 'Barba e Cabelo Completo',
      price: 80,
      description: 'Serviço completo de barba e cabelo',
      duration: 60,
      barberShopOwnerId: userEntity.id,
    };

    // Act
    const output = await sut.execute(input);

    // Assert
    expect(output.id).toBeDefined();
    expect(output.name).toBe('Barba e Cabelo Completo');
    expect(output.price).toBe(80);
    expect(output.description).toBe('Serviço completo de barba e cabelo');
    expect(output.duration).toBe(60);
    expect(output.createdAt).toBeInstanceOf(Date);
  });

  it('should create multiple services for the same barber shop', async () => {
    // Arrange - Create barber user and barber shop
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

    const createBarberShopInput: CreateBarberShopUseCase.Input = {
      name: barberShopData.name,
      address: barberShopData.address,
      ownerId: userEntity.id,
    };

    const createdBarberShop = await createBarberShopSut.execute(
      createBarberShopInput,
    );

    const firstInput: CreateServicesUseCase.Input = {
      name: 'Corte de Cabelo',
      price: 50,
      description: 'Corte tradicional',
      duration: 30,
      barberShopOwnerId: userEntity.id,
    };

    const secondInput: CreateServicesUseCase.Input = {
      name: 'Barba',
      price: 30,
      description: 'Aparar barba',
      duration: 20,
      barberShopOwnerId: userEntity.id,
    };

    // Act
    const firstOutput = await sut.execute(firstInput);
    const secondOutput = await sut.execute(secondInput);

    // Assert
    expect(firstOutput.id).toBeDefined();
    expect(firstOutput.barberShopId).toBe(createdBarberShop.id);
    expect(secondOutput.id).toBeDefined();
    expect(secondOutput.barberShopId).toBe(createdBarberShop.id);
    expect(firstOutput.id).not.toBe(secondOutput.id);

    const services = await prismaService.service.findMany();
    expect(services).toHaveLength(2);
  });

  it('should create service and verify it is persisted in database', async () => {
    // Arrange - Create barber user and barber shop
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

    const createBarberShopInput: CreateBarberShopUseCase.Input = {
      name: barberShopData.name,
      address: barberShopData.address,
      ownerId: userEntity.id,
    };

    await createBarberShopSut.execute(createBarberShopInput);

    const input: CreateServicesUseCase.Input = {
      name: 'Corte de Cabelo',
      price: 50,
      description: 'Corte tradicional',
      duration: 30,
      barberShopOwnerId: userEntity.id,
    };

    // Act
    const output = await sut.execute(input);

    // Assert
    const serviceInDb = await prismaService.service.findUnique({
      where: { id: output.id },
    });

    expect(serviceInDb).toBeDefined();
    expect(serviceInDb.name).toBe('Corte de Cabelo');
    expect(serviceInDb.price).toBe(50);
    expect(serviceInDb.description).toBe('Corte tradicional');
    expect(serviceInDb.duration).toBe(30);
  });
});
