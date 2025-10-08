import { PrismaClient, Service } from '@prisma/client';

import { ValidationError } from '@/shared/domain/errors/validation-error';
import { UserEntity } from '@/users/domain/entities/user.entity';
import { setupPrismaTests } from '@/shared/infrastructure/database/testing/setup-prisma-tests';
import { ServicesModelMapper } from '../../services-model.mapper';

describe('ServiceModelMapper integration tests', () => {
  let prismaService: PrismaClient;
  let props: any;

  beforeAll(async () => {
    setupPrismaTests();
    prismaService = new PrismaClient();
    await prismaService.$connect();
  });

  beforeEach(async () => {
    await prismaService.user.deleteMany();
    props = {
      id: 'd4255494-f981-4d26-a2a1-35d3f5b8d36a',
      name: 'Test name',
      price: 100.0,
      duration: 110,
      description: 'Test description',
      barberShopId: 'd4255494-f981-4d26-a2a1-35d3f5b8d36a',
      createdAt: new Date(),
    };
  });

  afterAll(async () => {
    await prismaService.$disconnect();
  });

  it('should throws error when service model is invalid', async () => {
    const model: Service = Object.assign(props, { name: null });
    expect(() => ServicesModelMapper.toEntity(model)).toThrowError(
      ValidationError,
    );
  });

  it('should convert a service model to a service entity', async () => {
    const model: Service = await prismaService.service.create({
      data: props,
    });
    const sut = ServicesModelMapper.toEntity(model);
    expect(sut).toBeInstanceOf(UserEntity);
    expect(sut.toJSON()).toStrictEqual(props);
  });
});
