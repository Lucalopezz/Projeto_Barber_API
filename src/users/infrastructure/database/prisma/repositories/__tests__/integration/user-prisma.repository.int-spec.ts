/* eslint-disable @typescript-eslint/no-unused-vars */
import { PrismaClient } from '@prisma/client';
import { UserPrismaRepository } from '../../user-prisma.repository';
import { Test, TestingModule } from '@nestjs/testing';
import { DatabaseModule } from '@/shared/infrastructure/database/database.module';
import { NotFoundError } from '@/shared/domain/errors/not-found-error';
import { UserEntity } from '@/users/domain/entities/user.entity';
import { UserRepository } from '@/users/domain/repositories/user.repository';
import { ConflictError } from '@/shared/domain/errors/conflict-error';
import { setupPrismaTests } from '@/shared/infrastructure/database/testing/setup-prisma-tests';
import { UserDataBuilder } from '@/users/domain/helpers/user-data-builder';
import { Role } from '@/users/domain/entities/role.enum';

describe('UserPrismaRepository integration tests', () => {
  const prismaService = new PrismaClient();
  let sut: UserPrismaRepository;
  let module: TestingModule;

  beforeAll(async () => {
    setupPrismaTests();
    module = await Test.createTestingModule({
      imports: [DatabaseModule.forTest(prismaService)],
    }).compile();
  });

  beforeEach(async () => {
    sut = new UserPrismaRepository(prismaService as any);
    await prismaService.user.deleteMany();
  });

  it('should throws error when entity not found', async () => {
    await expect(() => sut.findById('FakeId')).rejects.toThrow(
      new NotFoundError('UserModel not found using ID FakeId'),
    );
  });

  it('should finds a entity by id', async () => {
    const entity = new UserEntity(UserDataBuilder({}));
    const newUser = await prismaService.user.create({
      data: entity.toJSON(),
    });

    const output = await sut.findById(newUser.id);
    expect(output.toJSON()).toStrictEqual(entity.toJSON());
  });

  it('should insert a new entity', async () => {
    const entity = new UserEntity(UserDataBuilder({}));
    await sut.insert(entity);

    const result = await prismaService.user.findUnique({
      where: {
        id: entity._id,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        password: true,
        createdAt: true,
      },
    });

    expect(result).toStrictEqual(entity.toJSON());
  });

  it('should returns all users', async () => {
    const entity = new UserEntity(UserDataBuilder({}));
    const newUser = await prismaService.user.create({
      data: entity.toJSON(),
    });

    const entities = await sut.findAll();
    expect(entities).toHaveLength(1);
    expect(JSON.stringify(entities)).toBe(JSON.stringify([entity]));
    entities.map((item) =>
      expect(item.toJSON()).toStrictEqual(entity.toJSON()),
    );
  });

  it('should throws error on update when a entity not found', async () => {
    const entity = new UserEntity(UserDataBuilder({}));
    await expect(() => sut.update(entity)).rejects.toThrow(
      new NotFoundError(`UserModel not found using ID ${entity._id}`),
    );
  });

  it('should update a entity', async () => {
    const entity = new UserEntity(UserDataBuilder({}));
    const newUser = await prismaService.user.create({
      data: entity.toJSON(),
    });
    entity.update('new name');
    await sut.update(entity);

    const output = await prismaService.user.findUnique({
      where: {
        id: entity._id,
      },
    });
    expect(output.name).toBe('new name');
  });

  it('should throws error on delete when a entity not found', async () => {
    const entity = new UserEntity(UserDataBuilder({}));
    await expect(() => sut.delete(entity._id)).rejects.toThrow(
      new NotFoundError(`UserModel not found using ID ${entity._id}`),
    );
  });

  it('should delete a entity', async () => {
    const entity = new UserEntity(UserDataBuilder({}));
    const newUser = await prismaService.user.create({
      data: entity.toJSON(),
    });
    await sut.delete(entity._id);

    const output = await prismaService.user.findUnique({
      where: {
        id: entity._id,
      },
    });
    expect(output).toBeNull();
  });

  it('should throws error when a entity not found', async () => {
    await expect(() => sut.findByEmail('a@a.com')).rejects.toThrow(
      new NotFoundError(`UserModel not found using email a@a.com`),
    );
  });

  it('should finds a entity by email', async () => {
    const entity = new UserEntity(UserDataBuilder({ email: 'a@a.com' }));
    const newUser = await prismaService.user.create({
      data: entity.toJSON(),
    });
    const output = await sut.findByEmail('a@a.com');

    expect(output.toJSON()).toStrictEqual(entity.toJSON());
  });

  it('should throws error when a entity found by email', async () => {
    const entity = new UserEntity(UserDataBuilder({ email: 'a@a.com' }));
    const newUser = await prismaService.user.create({
      data: entity.toJSON(),
    });

    await expect(() => sut.emailExists('a@a.com')).rejects.toThrow(
      new ConflictError(`Email address already used`),
    );
  });

  it('should not finds a entity by email', async () => {
    expect.assertions(0);
    await sut.emailExists('a@a.com');
  });

  describe('search method tests', () => {
    it('should apply only pagination when the other params are null', async () => {
      const createdAt = new Date();
      const entities: UserEntity[] = [];
      const arrange = Array(16).fill(UserDataBuilder({}));
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

      const searchOutput = await sut.search(
        new UserRepository.UserSearchParams(),
      );
      const items = searchOutput.items;

      expect(searchOutput).toBeInstanceOf(UserRepository.UserSearchResult);
      expect(searchOutput.total).toBe(16);
      expect(searchOutput.items.length).toBe(15);
      searchOutput.items.forEach((item) => {
        expect(item).toBeInstanceOf(UserEntity);
      });
      items.reverse().forEach((item, index) => {
        expect(`test${index + 1}@mail.com`).toBe(item.email);
      });
    });

    it('should search using filter, sort and paginate', async () => {
      const createdAt = new Date();
      const entities: UserEntity[] = [];
      const arrange = ['test', 'a', 'TEST', 'b', 'TeSt'];
      arrange.forEach((element, index) => {
        entities.push(
          new UserEntity({
            ...UserDataBuilder({ name: element }),
            createdAt: new Date(createdAt.getTime() + index),
            role: Role.barber,
          }),
        );
      });

      await prismaService.user.createMany({
        data: entities.map((item) => item.toJSON()),
      });
      const filter = {
        name: 'TEST',
        role: Role.barber,
      };
      const searchOutputPage1 = await sut.search(
        new UserRepository.UserSearchParams({
          page: 1,
          perPage: 2,
          sort: 'name',
          sortDir: 'asc',
          filter,
        }),
      );

      expect(searchOutputPage1.items[0].toJSON()).toMatchObject(
        entities[0].toJSON(),
      );
      expect(searchOutputPage1.items[1].toJSON()).toMatchObject(
        entities[4].toJSON(),
      );

      const searchOutputPage2 = await sut.search(
        new UserRepository.UserSearchParams({
          page: 2,
          perPage: 2,
          sort: 'name',
          sortDir: 'asc',
          filter,
        }),
      );

      expect(searchOutputPage2.items[0].toJSON()).toMatchObject(
        entities[2].toJSON(),
      );
    });
    it('should filter users by valid role (barber)', async () => {
      const testUsers = [
        { ...UserDataBuilder({}), role: Role.client },
        { ...UserDataBuilder({}), role: Role.barber },
        { ...UserDataBuilder({}), role: Role.barber },
        { ...UserDataBuilder({}), role: Role.client },
        { ...UserDataBuilder({}), role: Role.barber },
      ];

      await prismaService.user.createMany({
        data: testUsers.map((user, index) => {
          const entity = new UserEntity({
            ...user,
            email: `user${index}@test.com`,
            createdAt: new Date(),
          });

          // Retorna o objeto plano usado pelo Prisma
          return entity.toJSON();
        }),
      });

      // Act - Search for barbers
      const result = await sut.search(
        new UserRepository.UserSearchParams({
          filter: { role: Role.barber },
          sort: 'createdAt',
          sortDir: 'asc',
        }),
      );

      // Assert
      expect(result.total).toBe(3); // Should find 3 barbers
      result.items.forEach((user) => {
        expect(user.role).toBe(Role.barber);
      });
    });
    it('should not apply role filter for invalid role values', async () => {
      const testUsers = [
        { ...UserDataBuilder({ name: 'barber1' }), role: Role.barber },
        { ...UserDataBuilder({ name: 'client1' }), role: Role.client },
        { ...UserDataBuilder({ name: 'testuser' }), role: Role.client },
      ];

      await prismaService.user.createMany({
        data: testUsers.map((user, index) => {
          const entity = new UserEntity({
            ...user,
            email: user.email ?? `user${index}@test.com`,
            createdAt: new Date(),
          });
          const raw = entity.toJSON();

          return raw;
        }),
      });

      const result = await sut.search(
        new UserRepository.UserSearchParams({
          filter: { role: 'invalid_role' as Role },
          sort: 'role',
          sortDir: 'asc',
        }),
      );

      expect(result.items.length).toBe(3); // Filter is ignored
    });
    it('should filter STRICTLY by role when searching for valid roles', async () => {
      const testUsers = [
        {
          ...UserDataBuilder({ name: 'John Barber' }),
          role: Role.barber,
          email: 'barber1@test.com',
        },
        {
          ...UserDataBuilder({ name: 'Mike Client' }),
          role: Role.client,
          email: 'client1@test.com',
        },
        {
          ...UserDataBuilder({ name: 'Anna Barber' }),
          role: Role.barber,
          email: 'barber2@test.com',
        },
        {
          ...UserDataBuilder({ name: 'Peter Barber' }),
          role: Role.client,
          email: 'client2@test.com',
        },
      ];

      await prismaService.user.createMany({
        data: testUsers.map((user, index) => {
          const entity = new UserEntity({
            ...user,
            createdAt: user.createdAt ?? new Date(),
          });

          const raw = entity.toJSON();

          return raw;
        }),
      });

      // Act: Search a role = 'barber'
      const result = await sut.search(
        new UserRepository.UserSearchParams({
          filter: { role: Role.barber }, // VAlid role
          sort: 'name',
          sortDir: 'asc',
        }),
      );

      // Assert
      expect(result.total).toBe(2);
      expect(result.items.map((u) => u.email)).toEqual([
        'barber2@test.com', // Anna Barber (barber)
        'barber1@test.com', // John Barber (barber)
      ]);
      expect(
        result.items.some((u) => u.email === 'client2@test.com'),
      ).toBeFalsy();
    });
  });
});
