import { BarberShopPrismaRepository } from '@/barberShop/infrastructure/database/prisma/repositories/barbershop-prisma.repository';
import { UserPrismaRepository } from '@/users/infrastructure/database/prisma/repositories/user-prisma.repository';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import { setupPrismaTests } from '@/shared/infrastructure/database/testing/setup-prisma-tests';
import { DeleteServicesUseCase } from '../../delete-services.usecase';
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

describe('DeleteServicesUseCase integration tests', () => {
  const prismaService = new PrismaClient();
  let sut: DeleteServicesUseCase.UseCase;
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
    sut = new DeleteServicesUseCase.UseCase(
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

  it('should delete service successfully', async () => {
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

    const deleteInput: DeleteServicesUseCase.Input = {
      id: createdService.id,
      barberShopOwnerId: userEntity.id,
    };

    // Act
    await expect(sut.execute(deleteInput)).resolves.toBeUndefined();

    // Assert - Verify service was deleted
    const services = await prismaService.service.findMany();
    expect(services).toHaveLength(0);
  });

  it('should throw BadRequestError when id is not provided', async () => {
    const input: DeleteServicesUseCase.Input = {
      id: '',
      barberShopOwnerId: 'some-owner-id',
    };

    await expect(sut.execute(input)).rejects.toThrow(
      new BadRequestError('Input data not provided'),
    );
  });

  it('should throw BadRequestError when barberShopOwnerId is not provided', async () => {
    const input: DeleteServicesUseCase.Input = {
      id: 'some-id',
      barberShopOwnerId: '',
    };

    await expect(sut.execute(input)).rejects.toThrow(
      new BadRequestError('Input data not provided'),
    );
  });

  it('should throw BadRequestError when barber shop is not found for owner', async () => {
    const input: DeleteServicesUseCase.Input = {
      id: 'some-service-id',
      barberShopOwnerId: 'non-existent-owner',
    };

    await expect(sut.execute(input)).rejects.toThrow(
      new BadRequestError('BarberShop not found for the given owner'),
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

    const deleteInput: DeleteServicesUseCase.Input = {
      id: 'non-existent-service-id',
      barberShopOwnerId: userEntity.id,
    };

    // Act & Assert
    await expect(sut.execute(deleteInput)).rejects.toThrow(
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

    // Try to delete first service with second barber shop owner
    const deleteInput: DeleteServicesUseCase.Input = {
      id: createdService.id,
      barberShopOwnerId: secondUserEntity.id,
    };

    // Act & Assert
    await expect(sut.execute(deleteInput)).rejects.toThrow(
      new BadRequestError('Service not found for the given barber shop'),
    );
  });

  it('should delete one service without affecting others', async () => {
    // Arrange - Create user, barber shop and multiple services
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

    // Create first service
    const firstServiceData = ServiceDataBuilder({
      name: 'Corte de Cabelo',
      price: 50,
      description: 'Corte tradicional',
      duration: 30,
    });

    const firstCreateInput: CreateServicesUseCase.Input = {
      name: firstServiceData.name,
      price: firstServiceData.price,
      description: firstServiceData.description,
      duration: firstServiceData.duration,
      barberShopOwnerId: userEntity.id,
    };

    const firstService = await createServiceSut.execute(firstCreateInput);

    // Create second service
    const secondServiceData = ServiceDataBuilder({
      name: 'Barba',
      price: 30,
      description: 'Aparar barba',
      duration: 20,
    });

    const secondCreateInput: CreateServicesUseCase.Input = {
      name: secondServiceData.name,
      price: secondServiceData.price,
      description: secondServiceData.description,
      duration: secondServiceData.duration,
      barberShopOwnerId: userEntity.id,
    };

    const secondService = await createServiceSut.execute(secondCreateInput);

    const deleteInput: DeleteServicesUseCase.Input = {
      id: firstService.id,
      barberShopOwnerId: userEntity.id,
    };

    // Act
    await sut.execute(deleteInput);

    // Assert - Verify only first service was deleted
    const services = await prismaService.service.findMany();
    expect(services).toHaveLength(1);
    expect(services[0].id).toBe(secondService.id);
    expect(services[0].name).toBe('Barba');
  });
});
