import { BarberShopPrismaRepository } from '@/barberShop/infrastructure/database/prisma/repositories/barbershop-prisma.repository';
import { UserPrismaRepository } from '@/users/infrastructure/database/prisma/repositories/user-prisma.repository';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import { setupPrismaTests } from '@/shared/infrastructure/database/testing/setup-prisma-tests';
import { ListServicesUseCase } from '../../list-services.usecase';
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

describe('ListServicesUseCase integration tests', () => {
  const prismaService = new PrismaClient();
  let sut: ListServicesUseCase.UseCase;
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
    sut = new ListServicesUseCase.UseCase(
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

  it('should list all services for a barber shop', async () => {
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

    await createServiceSut.execute(firstCreateInput);

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

    await createServiceSut.execute(secondCreateInput);

    // Create third service
    const thirdServiceData = ServiceDataBuilder({
      name: 'Pacote Completo',
      price: 80,
      description: 'Cabelo e barba',
      duration: 50,
    });

    const thirdCreateInput: CreateServicesUseCase.Input = {
      name: thirdServiceData.name,
      price: thirdServiceData.price,
      description: thirdServiceData.description,
      duration: thirdServiceData.duration,
      barberShopOwnerId: userEntity.id,
    };

    await createServiceSut.execute(thirdCreateInput);

    const listInput: ListServicesUseCase.Input = {
      userId: userEntity.id,
    };

    // Act
    const result = await sut.execute(listInput);

    // Assert
    expect(result).toHaveLength(3);
    expect(result[0].name).toBe('Corte de Cabelo');
    expect(result[0].price).toBe(50);
    expect(result[1].name).toBe('Barba');
    expect(result[1].price).toBe(30);
    expect(result[2].name).toBe('Pacote Completo');
    expect(result[2].price).toBe(80);
  });

  it('should return empty array when barber shop has no services', async () => {
    // Arrange - Create user and barber shop without services
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

    const listInput: ListServicesUseCase.Input = {
      userId: userEntity.id,
    };

    // Act
    const result = await sut.execute(listInput);

    // Assert
    expect(result).toHaveLength(0);
    expect(result).toEqual([]);
  });

  it('should throw NotFoundError when barber shop does not exist', async () => {
    const input: ListServicesUseCase.Input = {
      userId: 'non-existent-user-id',
    };

    await expect(sut.execute(input)).rejects.toThrow(
      new NotFoundError('BarberShop not found'),
    );
  });

  it('should list only services from the correct barber shop', async () => {
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

    // Create services for first barber shop
    const firstServiceInput: CreateServicesUseCase.Input = {
      name: 'Corte Premium',
      price: 100,
      description: 'Corte premium',
      duration: 45,
      barberShopOwnerId: firstUserEntity.id,
    };

    await createServiceSut.execute(firstServiceInput);

    const secondServiceInput: CreateServicesUseCase.Input = {
      name: 'Barba Premium',
      price: 60,
      description: 'Barba premium',
      duration: 30,
      barberShopOwnerId: firstUserEntity.id,
    };

    await createServiceSut.execute(secondServiceInput);

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

    // Create service for second barber shop
    const thirdServiceInput: CreateServicesUseCase.Input = {
      name: 'Corte Simples',
      price: 40,
      description: 'Corte simples',
      duration: 20,
      barberShopOwnerId: secondUserEntity.id,
    };

    await createServiceSut.execute(thirdServiceInput);

    const listInput: ListServicesUseCase.Input = {
      userId: firstUserEntity.id,
    };

    // Act
    const result = await sut.execute(listInput);

    // Assert - Should only return services from first barber shop
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('Corte Premium');
    expect(result[0].price).toBe(100);
    expect(result[1].name).toBe('Barba Premium');
    expect(result[1].price).toBe(60);
    expect(result.find((s) => s.name === 'Corte Simples')).toBeUndefined();
  });

  it('should list services with all properties correctly mapped', async () => {
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

    await createServiceSut.execute(createInput);

    const listInput: ListServicesUseCase.Input = {
      userId: userEntity.id,
    };

    // Act
    const result = await sut.execute(listInput);

    // Assert
    expect(result).toHaveLength(1);
    expect(result[0].id).toBeDefined();
    expect(result[0].name).toBe('Corte de Cabelo');
    expect(result[0].price).toBe(50);
    expect(result[0].description).toBe('Corte tradicional');
    expect(result[0].duration).toBe(30);
    expect(result[0].barberShopId).toBe(createdBarberShop.id);
    expect(result[0].createdAt).toBeInstanceOf(Date);
  });
});
