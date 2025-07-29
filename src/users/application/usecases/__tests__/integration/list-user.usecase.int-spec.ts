/* eslint-disable @typescript-eslint/no-unused-vars */

import { DatabaseModule } from '@/shared/infrastructure/database/database.module';
import { UserPrismaRepository } from '@/users/infrastructure/database/prisma/repositories/user-prisma.repository';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import { UserEntity } from '@/users/domain/entities/user.entity';
import { ListUsersUseCase } from '../../list-users.usecase';
import { setupPrismaTests } from '@/shared/infrastructure/database/testing/setup-prisma-tests';
import { UserDataBuilder } from '@/users/domain/helpers/user-data-builder';
import { Role } from '@/users/domain/entities/role.enum';

describe('ListUsersUseCase integration tests', () => {
  const prismaService = new PrismaClient();
  let sut: ListUsersUseCase.UseCase;
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
    sut = new ListUsersUseCase.UseCase(repository);
    await prismaService.user.deleteMany();
  });

  afterAll(async () => {
    await module.close();
  });

  it('should return the users ordered by createdAt', async () => {
    const createdAt = new Date();
    const entities: UserEntity[] = [];
    const arrange = Array(3).fill(UserDataBuilder({}));
    arrange.forEach((element, index) => {
      entities.push(
        new UserEntity({
          ...element,
          email: `test${index}@mail.com`,
          createdAt: new Date(createdAt.getTime() + index),
        }),
      );
    });
    await prismaService.user.createMany({
      data: entities.map((item) => item.toJSON()),
    });

    const output = await sut.execute({});

    expect(output).toStrictEqual({
      items: entities.reverse().map((item) => item.toJSON()),
      total: 3,
      currentPage: 1,
      perPage: 15,
      lastPage: 1,
    });
  });

  it('should return paginated and filtered users by name and role', async () => {
    const createdAt = new Date();
    const entities: UserEntity[] = [];
    const names = ['test', 'a', 'TEST', 'b', 'TeSt'];
    names.forEach((nameValue, index) => {
      entities.push(
        new UserEntity({
          ...UserDataBuilder({ name: nameValue, role: Role.client }),
          createdAt: new Date(createdAt.getTime() + index),
        }),
      );
    });
    await prismaService.user.createMany({
      data: entities.map((i) => i.toJSON()),
    });

    // page 1
    let output = await sut.execute({
      page: 1,
      perPage: 2,
      sort: 'name',
      sortDir: 'asc',
      name: 'TEST',
      role: Role.client,
    });

    const expectedPage1 = [entities[0].toJSON(), entities[4].toJSON()];
    expect(output).toMatchObject({
      items: expectedPage1,
      total: 3,
      currentPage: 1,
      perPage: 2,
      lastPage: 2,
    });

    // page 2 should return the remaining match
    output = await sut.execute({
      page: 2,
      perPage: 2,
      sort: 'name',
      sortDir: 'asc',
      name: 'TEST',
      role: Role.client,
    });
    const expectedPage2 = [entities[2].toJSON()];
    expect(output).toMatchObject({
      items: expectedPage2,
      total: 3,
      currentPage: 2,
      perPage: 2,
      lastPage: 2,
    });
  });

  it('should filter users by barber role', async () => {
    const createdAt = new Date();
    const entities: UserEntity[] = [];

    const arrange = [
      { ...UserDataBuilder({}), role: Role.client },
      { ...UserDataBuilder({}), role: Role.barber },
      { ...UserDataBuilder({}), role: Role.barber },
      { ...UserDataBuilder({}), role: Role.client },
      { ...UserDataBuilder({}), role: Role.barber },
    ];

    arrange.forEach((element, index) => {
      entities.push(
        new UserEntity({
          ...element,
          email: `test${index}@mail.com`,
          createdAt: new Date(createdAt.getTime() + index),
        }),
      );
    });

    await prismaService.user.createMany({
      data: entities.map((item) => item.toJSON()),
    });

    const output = await sut.execute({
      sort: 'role',
      sortDir: 'asc',
      role: Role.barber,
    });

    const expectedBarbers = entities
      .filter((e) => e.role === Role.barber)
      .map((item) => item.toJSON());

    expect(output).toMatchObject({
      items: expectedBarbers,
      total: expectedBarbers.length,
      currentPage: 1,
      perPage: 15,
      lastPage: 1,
    });
  });
});
