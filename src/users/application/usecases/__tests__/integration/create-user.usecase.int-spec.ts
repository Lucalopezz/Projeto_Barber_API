import { UserPrismaRepository } from '@/users/infrastructure/database/prisma/repositories/user-prisma.repository';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import { HashProvider } from '@/shared/application/providers/hash-provider';
import { setupPrismaTests } from '@/shared/infrastructure/database/testing/setup-prisma-tests';
import { BcryptjsHashProvider } from '@/shared/application/providers/bcryptjs-hash.provider';
import { CreateUserUseCase } from '../../create-user.usecase';
import { DatabaseModule } from '@/shared/infrastructure/database/database.module';
import { Role } from '@/users/domain/entities/role.enum';

describe('SignupUseCase integration tests', () => {
  const prismaService = new PrismaClient();
  let sut: CreateUserUseCase.UseCase;
  let repository: UserPrismaRepository;
  let module: TestingModule;
  let hashProvider: HashProvider;

  beforeAll(async () => {
    setupPrismaTests();
    module = await Test.createTestingModule({
      imports: [DatabaseModule.forTest(prismaService)],
    }).compile();
    repository = new UserPrismaRepository(prismaService as any);
    hashProvider = new BcryptjsHashProvider();
  });

  beforeEach(async () => {
    sut = new CreateUserUseCase.UseCase(repository, hashProvider);
    await prismaService.user.deleteMany();
  });

  afterAll(async () => {
    await module.close();
  });

  it('should create a user', async () => {
    const props = {
      name: 'test name',
      email: 'a@a.com',
      role: 'barber' as Role,
      password: 'TestPassword123',
    };
    const output = await sut.execute(props);
    expect(output.id).toBeDefined();
    expect(output.createdAt).toBeInstanceOf(Date);
  });
});
