import { BarberShopPrismaRepository } from '@/barberShop/infrastructure/database/prisma/repositories/barbershop-prisma.repository';
import { UserPrismaRepository } from '@/users/infrastructure/database/prisma/repositories/user-prisma.repository';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import { setupPrismaTests } from '@/shared/infrastructure/database/testing/setup-prisma-tests';
import { UpdateServicesUseCase } from '../../update-services.usecase';
import { CreateServicesUseCase } from '../../create-services.usecase';
import { CreateBarberShopUseCase } from '@/barberShop/application/usecases/create-barbershop.usecase';
import { DatabaseModule } from '@/shared/infrastructure/database/database.module';
import { Role } from '@/users/domain/entities/role.enum';
import { UserEntity } from '@/users/domain/entities/user.entity';
import { NotFoundError } from '@/shared/domain/errors/not-found-error';
import { BadRequestError } from '@/shared/application/errors/bad-request-error';
import { UserDataBuilder } from '@/users/domain/helpers/user-data-builder';
import { BarberShopDataBuilder } from '@/barberShop/domain/helpers/barberShop-data-builder';
import { ServiceDataBuilder } from '@/services/domain/helpers/service-data-builder';
import { ServicesPrismaRepository } from '@/services/infrastructure/database/prisma/services-prisma.repository';

describe('UpdateServicesUseCase integration tests', () => {
  const prismaService = new PrismaClient();
  let sut: UpdateServicesUseCase.UseCase;
  let createServiceSut: CreateServicesUseCase.UseCase;
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
    sut = new UpdateServicesUseCase.UseCase(
      servicesRepository,
      barberShopRepository,
    );
    createServiceSut = new CreateServicesUseCase.UseCase(
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

  it('should update service name successfully', async () => {
    // Arrange - Create user, barber shop and service
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

    const serviceData = ServiceDataBuilder({
      name: 'Original Name',
      price: 50,
      description: 'Original Description',
      duration: 30,
    });

    const createInput: CreateServicesUseCase.Input = {
      name: serviceData.name,
      price: serviceData.price,
      description: serviceData.description,
      duration: serviceData.duration,
      barberShopOwnerId: userEntity.id,
    };

    const createdService = await createServiceSut.execute(createInput);

    const updateInput: UpdateServicesUseCase.Input = {
      id: createdService.id,
      name: 'Updated Name',
      barberShopOwnerId: userEntity.id,
    };

    // Act
    const result = await sut.execute(updateInput);

    // Assert
    expect(result.id).toBe(createdService.id);
    expect(result.name).toBe('Updated Name');
    expect(result.price).toBe(serviceData.price);
    expect(result.description).toBe(serviceData.description);
    expect(result.duration).toBe(serviceData.duration);
    expect(result.createdAt).toBeInstanceOf(Date);
  });

  it('should update service price successfully', async () => {
    // Arrange - Create user, barber shop and service
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

    const serviceData = ServiceDataBuilder({
      name: 'Corte de Cabelo',
      price: 50,
      description: 'Corte tradicional',
      duration: 30,
    });

    const createInput: CreateServicesUseCase.Input = {
      name: serviceData.name,
      price: serviceData.price,
      description: serviceData.description,
      duration: serviceData.duration,
      barberShopOwnerId: userEntity.id,
    };

    const createdService = await createServiceSut.execute(createInput);

    const updateInput: UpdateServicesUseCase.Input = {
      id: createdService.id,
      price: 70,
      barberShopOwnerId: userEntity.id,
    };

    // Act
    const result = await sut.execute(updateInput);

    // Assert
    expect(result.id).toBe(createdService.id);
    expect(result.name).toBe(serviceData.name);
    expect(result.price).toBe(70);
    expect(result.description).toBe(serviceData.description);
    expect(result.duration).toBe(serviceData.duration);
    expect(result.createdAt).toBeInstanceOf(Date);
  });

  it('should update service description successfully', async () => {
    // Arrange - Create user, barber shop and service
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

    const serviceData = ServiceDataBuilder({
      name: 'Corte de Cabelo',
      price: 50,
      description: 'Original Description',
      duration: 30,
    });

    const createInput: CreateServicesUseCase.Input = {
      name: serviceData.name,
      price: serviceData.price,
      description: serviceData.description,
      duration: serviceData.duration,
      barberShopOwnerId: userEntity.id,
    };

    const createdService = await createServiceSut.execute(createInput);

    const updateInput: UpdateServicesUseCase.Input = {
      id: createdService.id,
      description: 'Updated Description',
      barberShopOwnerId: userEntity.id,
    };

    // Act
    const result = await sut.execute(updateInput);

    // Assert
    expect(result.id).toBe(createdService.id);
    expect(result.name).toBe(serviceData.name);
    expect(result.price).toBe(serviceData.price);
    expect(result.description).toBe('Updated Description');
    expect(result.duration).toBe(serviceData.duration);
    expect(result.createdAt).toBeInstanceOf(Date);
  });

  it('should update service duration successfully', async () => {
    // Arrange - Create user, barber shop and service
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

    const serviceData = ServiceDataBuilder({
      name: 'Corte de Cabelo',
      price: 50,
      description: 'Corte tradicional',
      duration: 30,
    });

    const createInput: CreateServicesUseCase.Input = {
      name: serviceData.name,
      price: serviceData.price,
      description: serviceData.description,
      duration: serviceData.duration,
      barberShopOwnerId: userEntity.id,
    };

    const createdService = await createServiceSut.execute(createInput);

    const updateInput: UpdateServicesUseCase.Input = {
      id: createdService.id,
      duration: 45,
      barberShopOwnerId: userEntity.id,
    };

    // Act
    const result = await sut.execute(updateInput);

    // Assert
    expect(result.id).toBe(createdService.id);
    expect(result.name).toBe(serviceData.name);
    expect(result.price).toBe(serviceData.price);
    expect(result.description).toBe(serviceData.description);
    expect(result.duration).toBe(45);
    expect(result.createdAt).toBeInstanceOf(Date);
  });

  it('should update multiple fields successfully', async () => {
    // Arrange - Create user, barber shop and service
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

    const serviceData = ServiceDataBuilder({
      name: 'Original Name',
      price: 50,
      description: 'Original Description',
      duration: 30,
    });

    const createInput: CreateServicesUseCase.Input = {
      name: serviceData.name,
      price: serviceData.price,
      description: serviceData.description,
      duration: serviceData.duration,
      barberShopOwnerId: userEntity.id,
    };

    const createdService = await createServiceSut.execute(createInput);

    const updateInput: UpdateServicesUseCase.Input = {
      id: createdService.id,
      name: 'Updated Name',
      price: 80,
      description: 'Updated Description',
      duration: 60,
      barberShopOwnerId: userEntity.id,
    };

    // Act
    const result = await sut.execute(updateInput);

    // Assert
    expect(result.id).toBe(createdService.id);
    expect(result.name).toBe('Updated Name');
    expect(result.price).toBe(80);
    expect(result.description).toBe('Updated Description');
    expect(result.duration).toBe(60);
    expect(result.createdAt).toBeInstanceOf(Date);
  });

  it('should throw NotFoundError when barber shop is not found', async () => {
    const updateInput: UpdateServicesUseCase.Input = {
      id: 'some-service-id',
      name: 'Updated Name',
      barberShopOwnerId: 'non-existent-owner-id',
    };

    await expect(sut.execute(updateInput)).rejects.toThrow(
      new NotFoundError('BarberShop not found'),
    );
  });

  it('should throw BadRequestError when service is not found', async () => {
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

    const createBarberShopInput: CreateBarberShopUseCase.Input = {
      name: barberShopData.name,
      address: barberShopData.address,
      ownerId: userEntity.id,
    };

    await createBarberShopSut.execute(createBarberShopInput);

    const updateInput: UpdateServicesUseCase.Input = {
      id: 'non-existent-service-id',
      name: 'Updated Name',
      barberShopOwnerId: userEntity.id,
    };

    // Act & Assert
    await expect(sut.execute(updateInput)).rejects.toThrow(
      new BadRequestError(
        'ServiceModel not found using ID non-existent-service-id',
      ),
    );
  });

  it('should throw BadRequestError when service belongs to different barber shop', async () => {
    // Arrange - Create first user and barber shop
    const firstUserData = UserDataBuilder({
      role: Role.barber,
      email: 'barber1@test.com',
    });
    const firstUserEntity = new UserEntity(firstUserData);
    await userRepository.insert(firstUserEntity);

    const firstBarberShopData = BarberShopDataBuilder({
      ownerId: firstUserEntity.id,
      name: 'First Barber Shop',
    });

    const firstCreateBarberShopInput: CreateBarberShopUseCase.Input = {
      name: firstBarberShopData.name,
      address: firstBarberShopData.address,
      ownerId: firstUserEntity.id,
    };

    await createBarberShopSut.execute(firstCreateBarberShopInput);

    // Create service for first barber shop
    const serviceData = ServiceDataBuilder({
      name: 'Corte de Cabelo',
      price: 50,
      description: 'Corte tradicional',
      duration: 30,
    });

    const createServiceInput: CreateServicesUseCase.Input = {
      name: serviceData.name,
      price: serviceData.price,
      description: serviceData.description,
      duration: serviceData.duration,
      barberShopOwnerId: firstUserEntity.id,
    };

    const createdService = await createServiceSut.execute(createServiceInput);

    // Create second user and barber shop
    const secondUserData = UserDataBuilder({
      role: Role.barber,
      email: 'barber2@test.com',
    });
    const secondUserEntity = new UserEntity(secondUserData);
    await userRepository.insert(secondUserEntity);

    const secondBarberShopData = BarberShopDataBuilder({
      ownerId: secondUserEntity.id,
      name: 'Second Barber Shop',
    });

    const secondCreateBarberShopInput: CreateBarberShopUseCase.Input = {
      name: secondBarberShopData.name,
      address: secondBarberShopData.address,
      ownerId: secondUserEntity.id,
    };

    await createBarberShopSut.execute(secondCreateBarberShopInput);

    // Try to update first service with second barber shop owner
    const updateInput: UpdateServicesUseCase.Input = {
      id: createdService.id,
      name: 'Updated Name',
      barberShopOwnerId: secondUserEntity.id,
    };

    // Act & Assert
    await expect(sut.execute(updateInput)).rejects.toThrow(
      new BadRequestError('Service not found for the given barber shop'),
    );
  });
});
