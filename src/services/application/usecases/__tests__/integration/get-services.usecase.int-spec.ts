import { BarberShopPrismaRepository } from '@/barberShop/infrastructure/database/prisma/repositories/barbershop-prisma.repository';
import { UserPrismaRepository } from '@/users/infrastructure/database/prisma/repositories/user-prisma.repository';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import { setupPrismaTests } from '@/shared/infrastructure/database/testing/setup-prisma-tests';
import { GetServicesUseCase } from '../../get-services.usecase';
import { CreateServicesUseCase } from '../../create-services.usecase';
import { CreateBarberShopUseCase } from '@/barberShop/application/usecases/create-barbershop.usecase';
import { DatabaseModule } from '@/shared/infrastructure/database/database.module';
import { Role } from '@/users/domain/entities/role.enum';
import { UserEntity } from '@/users/domain/entities/user.entity';
import { NotFoundError } from '@/shared/domain/errors/not-found-error';
import { UserDataBuilder } from '@/users/domain/helpers/user-data-builder';
import { BarberShopDataBuilder } from '@/barberShop/domain/helpers/barberShop-data-builder';
import { ServiceDataBuilder } from '@/services/domain/helpers/service-data-builder';
import { ServicesPrismaRepository } from '@/services/infrastructure/database/prisma/services-prisma.repository';

describe('GetServicesUseCase integration tests', () => {
  const prismaService = new PrismaClient();
  let sut: GetServicesUseCase.UseCase;
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
    sut = new GetServicesUseCase.UseCase(servicesRepository);
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

  it('should get service successfully', async () => {
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

    const createdBarberShop = await createBarberShopSut.execute(
      createBarberShopInput,
    );

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

    const getInput: GetServicesUseCase.Input = {
      id: createdService.id,
    };

    // Act
    const result = await sut.execute(getInput);

    // Assert
    expect(result.id).toBe(createdService.id);
    expect(result.name).toBe(serviceData.name);
    expect(result.price).toBe(serviceData.price);
    expect(result.description).toBe(serviceData.description);
    expect(result.duration).toBe(serviceData.duration);
    expect(result.barberShopId).toBe(createdBarberShop.id);
    expect(result.createdAt).toBeInstanceOf(Date);
  });

  it('should throw NotFoundError when service does not exist', async () => {
    const input: GetServicesUseCase.Input = {
      id: 'non-existent-id',
    };

    await expect(sut.execute(input)).rejects.toThrow(
      new NotFoundError('ServiceModel not found using ID non-existent-id'),
    );
  });

  it('should get service with all properties correctly', async () => {
    // Arrange - Create user, barber shop and service with specific data
    const userData = UserDataBuilder({
      role: Role.barber,
      email: 'barber@test.com',
    });
    const userEntity = new UserEntity(userData);
    await userRepository.insert(userEntity);

    const barberShopData = BarberShopDataBuilder({
      ownerId: userEntity.id,
      name: 'Premium Barber Shop',
    });

    const createBarberShopInput: CreateBarberShopUseCase.Input = {
      name: barberShopData.name,
      address: barberShopData.address,
      ownerId: userEntity.id,
    };

    const createdBarberShop = await createBarberShopSut.execute(
      createBarberShopInput,
    );

    const createInput: CreateServicesUseCase.Input = {
      name: 'Barba e Cabelo Premium',
      price: 120,
      description: 'Serviço completo com produtos premium',
      duration: 90,
      barberShopOwnerId: userEntity.id,
    };

    const createdService = await createServiceSut.execute(createInput);

    const getInput: GetServicesUseCase.Input = {
      id: createdService.id,
    };

    // Act
    const result = await sut.execute(getInput);

    // Assert
    expect(result.id).toBe(createdService.id);
    expect(result.name).toBe('Barba e Cabelo Premium');
    expect(result.price).toBe(120);
    expect(result.description).toBe('Serviço completo com produtos premium');
    expect(result.duration).toBe(90);
    expect(result.barberShopId).toBe(createdBarberShop.id);
    expect(result.createdAt).toBeInstanceOf(Date);
  });

  it('should get correct service when multiple services exist', async () => {
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
    const firstServiceInput: CreateServicesUseCase.Input = {
      name: 'Corte de Cabelo',
      price: 50,
      description: 'Corte tradicional',
      duration: 30,
      barberShopOwnerId: userEntity.id,
    };

    await createServiceSut.execute(firstServiceInput);

    // Create second service
    const secondServiceInput: CreateServicesUseCase.Input = {
      name: 'Barba',
      price: 30,
      description: 'Aparar barba',
      duration: 20,
      barberShopOwnerId: userEntity.id,
    };

    const secondService = await createServiceSut.execute(secondServiceInput);

    // Create third service
    const thirdServiceInput: CreateServicesUseCase.Input = {
      name: 'Pacote Completo',
      price: 80,
      description: 'Cabelo e barba',
      duration: 50,
      barberShopOwnerId: userEntity.id,
    };

    await createServiceSut.execute(thirdServiceInput);

    const getInput: GetServicesUseCase.Input = {
      id: secondService.id,
    };

    // Act
    const result = await sut.execute(getInput);

    // Assert - Verify we got the correct service (second one)
    expect(result.id).toBe(secondService.id);
    expect(result.name).toBe('Barba');
    expect(result.price).toBe(30);
    expect(result.description).toBe('Aparar barba');
    expect(result.duration).toBe(20);
  });
});
