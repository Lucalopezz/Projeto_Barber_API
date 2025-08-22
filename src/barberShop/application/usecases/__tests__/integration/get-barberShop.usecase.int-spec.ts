import { BarberShopPrismaRepository } from '@/barberShop/infrastructure/database/prisma/repositories/barbershop-prisma.repository';
import { UserPrismaRepository } from '@/users/infrastructure/database/prisma/repositories/user-prisma.repository';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import { setupPrismaTests } from '@/shared/infrastructure/database/testing/setup-prisma-tests';
import { GetBarberShopUseCase } from '../../get-barbershop.usecase';
import { CreateBarberShopUseCase } from '../../create-barbershop.usecase';
import { DatabaseModule } from '@/shared/infrastructure/database/database.module';
import { Role } from '@/users/domain/entities/role.enum';
import { UserEntity } from '@/users/domain/entities/user.entity';
import { NotFoundError } from '@/shared/domain/errors/not-found-error';
import { UserDataBuilder } from '@/users/domain/helpers/user-data-builder';
import { BarberShopDataBuilder } from '@/barberShop/domain/helpers/barberShop-data-builder';

describe('GetBarberShopUseCase integration tests', () => {
  const prismaService = new PrismaClient();
  let sut: GetBarberShopUseCase.UseCase;
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
    sut = new GetBarberShopUseCase.UseCase(barberShopRepository);
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

  it('should get barber shop successfully', async () => {
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

    const createInput: CreateBarberShopUseCase.Input = {
      name: barberShopData.name,
      address: barberShopData.address,
      ownerId: userEntity.id,
    };

    const createdBarberShop = await createSut.execute(createInput);

    const getInput: GetBarberShopUseCase.Input = {
      id: createdBarberShop.id,
    };

    // Act
    const result = await sut.execute(getInput);

    // Assert
    expect(result.id).toBe(createdBarberShop.id);
    expect(result.name).toBe(barberShopData.name);
    expect(result.address).toBe(barberShopData.address.toString());
    expect(result.ownerId).toBe(userEntity.id);
    expect(result.createdAt).toBeInstanceOf(Date);
  });

  it('should throw NotFoundError when barber shop does not exist', async () => {
    const input: GetBarberShopUseCase.Input = {
      id: 'non-existent-id',
    };

    await expect(sut.execute(input)).rejects.toThrow(
      new NotFoundError('BarberShop not found using ID non-existent-id'),
    );
  });
});
