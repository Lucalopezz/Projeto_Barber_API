// delete-barbershop.usecase.integration.spec.ts
import { BarberShopPrismaRepository } from '@/barberShop/infrastructure/database/prisma/repositories/barbershop-prisma.repository';
import { UserPrismaRepository } from '@/users/infrastructure/database/prisma/repositories/user-prisma.repository';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import { setupPrismaTests } from '@/shared/infrastructure/database/testing/setup-prisma-tests';
import { DeleteBarberShopUseCase } from '../../delete-barbershop.usecase';
import { CreateBarberShopUseCase } from '../../create-barbershop.usecase';
import { DatabaseModule } from '@/shared/infrastructure/database/database.module';
import { Role } from '@/users/domain/entities/role.enum';
import { UserEntity } from '@/users/domain/entities/user.entity';
import { BadRequestError } from '@/shared/application/errors/bad-request-error';
import { UserDataBuilder } from '@/users/domain/helpers/user-data-builder';
import { BarberShopDataBuilder } from '@/barberShop/domain/helpers/barberShop-data-builder';

describe('DeleteBarberShopUseCase integration tests', () => {
  const prismaService = new PrismaClient();
  let sut: DeleteBarberShopUseCase.UseCase;
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
    sut = new DeleteBarberShopUseCase.UseCase(barberShopRepository);
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

  it('should delete barber shop successfully', async () => {
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

    const deleteInput: DeleteBarberShopUseCase.Input = {
      id: createdBarberShop.id,
      ownerId: userEntity.id,
    };

    // Act
    await expect(sut.execute(deleteInput)).resolves.toBeUndefined();

    // Assert - Verify barber shop was deleted
    const barberShops = await prismaService.barberShop.findMany();
    expect(barberShops).toHaveLength(0);
  });

  it('should throw BadRequestError when id is not provided', async () => {
    const input: DeleteBarberShopUseCase.Input = {
      id: '',
      ownerId: 'some-owner-id',
    };

    await expect(sut.execute(input)).rejects.toThrow(
      new BadRequestError('Input data not provided'),
    );
  });

  it('should throw BadRequestError when ownerId is not provided', async () => {
    const input: DeleteBarberShopUseCase.Input = {
      id: 'some-id',
      ownerId: '',
    };

    await expect(sut.execute(input)).rejects.toThrow(
      new BadRequestError('Input data not provided'),
    );
  });

  it('should throw BadRequestError when barber shop is not found for owner', async () => {
    const input: DeleteBarberShopUseCase.Input = {
      id: 'non-existent-id',
      ownerId: 'non-existent-owner',
    };

    await expect(sut.execute(input)).rejects.toThrow(
      new BadRequestError('Owner or BarberShop not found'),
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

    const deleteInput: DeleteBarberShopUseCase.Input = {
      id: 'wrong-id',
      ownerId: userEntity.id,
    };

    // Act & Assert
    await expect(sut.execute(deleteInput)).rejects.toThrow(
      new BadRequestError('Owner or BarberShop not found'),
    );
  });
});
