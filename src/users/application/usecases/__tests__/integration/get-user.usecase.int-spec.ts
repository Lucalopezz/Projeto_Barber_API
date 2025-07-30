/* eslint-disable @typescript-eslint/no-unused-vars */

import { DatabaseModule } from '@/shared/infrastructure/database/database.module';
import { UserPrismaRepository } from '@/users/infrastructure/database/prisma/repositories/user-prisma.repository';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import { NotFoundError } from '@/shared/domain/errors/not-found-error';
import { UserEntity } from '@/users/domain/entities/user.entity';
import { setupPrismaTests } from '@/shared/infrastructure/database/testing/setup-prisma-tests';
import { GetUserUseCase } from '../../get-user.usecase';
import { UserDataBuilder } from '@/users/domain/helpers/user-data-builder';

describe('GetUserUseCase integration tests', () => {
  const prismaService = new PrismaClient();
  let sut: GetUserUseCase.UseCase;
  let repository: UserPrismaRepository;
  let module: TestingModule;

  beforeAll(async () => {
    setupPrismaTests();
    module = await Test.createTestingModule({
      imports: [DatabaseModule.forTest(prismaService)],
    }).compile();
    repository = new UserPrismaRepository(prismaService as any);
  });

  beforeEach(async () => {
    sut = new GetUserUseCase.UseCase(repository);
    await prismaService.user.deleteMany();
  });

  afterAll(async () => {
    await module.close();
  });

  it('should throws error when entity not found', async () => {
    await expect(() => sut.execute({ id: 'fakeId' })).rejects.toThrow(
      new NotFoundError('UserModel not found using ID fakeId'),
    );
  });

  it('should returns a user', async () => {
    const entity = new UserEntity(UserDataBuilder({}));
    const model = await prismaService.user.create({
      data: entity.toJSON(),
    });

    const output = await sut.execute({ id: entity._id });

    const { barberShopId, updatedAt, ...items } = model;

    expect(output).toMatchObject(items);
  });
});
