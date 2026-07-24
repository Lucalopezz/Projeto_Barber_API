import { UnauthorizedError } from '@/shared/application/errors/unauthorized-error';
import { Controller, Get, INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { UnauthorizedErrorFilter } from '../../unauthorized-error.filter';

@Controller('stub')
class StubController {
  @Get()
  index() {
    throw new UnauthorizedError('You cannot access this resource');
  }
}

describe('UnauthorizedErrorFilter (e2e)', () => {
  let app: INestApplication;
  let module: TestingModule;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      controllers: [StubController],
    }).compile();
    app = module.createNestApplication();
    app.useGlobalFilters(new UnauthorizedErrorFilter());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    await module.close();
  });

  it('should be defined', () => {
    expect(new UnauthorizedErrorFilter()).toBeDefined();
  });

  it('should return 403 for an UnauthorizedError', () => {
    return request(app.getHttpServer()).get('/stub').expect(403).expect({
      statusCode: 403,
      error: 'Forbidden',
      message: 'You cannot access this resource',
    });
  });
});
