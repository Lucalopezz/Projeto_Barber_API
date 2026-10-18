import { BadRequestError } from '@/shared/application/errors/bad-request-error';
import { InvalidCredentialError } from '@/shared/application/errors/invalid-credentials-error';
import { InvalidPasswordError } from '@/shared/application/errors/invalid-password-error';
import { UnauthorizedError } from '@/shared/application/errors/unauthorized-error';
import { ConflictError } from '@/shared/domain/errors/conflict-error';
import { NotFoundError } from '@/shared/domain/errors/not-found-error';
import {
  EntityValidationError,
  ValidationError,
} from '@/shared/domain/errors/validation-error';
import { applyGlobalConfig } from '@/global-config';
import { EnvConfigService } from '@/shared/infrastructure/env-config/env-config.service';
import { Controller, Get, Param } from '@nestjs/common';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';

const errors = {
  badRequest: new BadRequestError('Invalid business input'),
  validation: new ValidationError('Invalid address'),
  entityValidation: new EntityValidationError({ name: ['invalid name'] }),
  credentials: new InvalidCredentialError('Invalid credentials'),
  password: new InvalidPasswordError('Invalid password'),
  unauthorized: new UnauthorizedError('Access denied'),
  notFound: new NotFoundError('Not found'),
  conflict: new ConflictError('Already exists'),
  unexpected: new Error('private database details'),
};

@Controller('errors')
class ErrorController {
  @Get(':kind')
  get(@Param('kind') kind: keyof typeof errors) {
    throw errors[kind];
  }
}

describe('Business error mapping (real Fastify)', () => {
  let app: NestFastifyApplication;
  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [ErrorController],
    }).compile();
    app = moduleRef.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
      { logger: false },
    );
    applyGlobalConfig(app, {
      getCorsAllowedOrigins: () => ['http://localhost:5173'],
    } as unknown as EnvConfigService);
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });
  afterAll(async () => app?.close());

  it.each([
    ['badRequest', 400, 'Bad Request'],
    ['validation', 422, 'Unprocessable Entity'],
    ['entityValidation', 422, 'Unprocessable Entity'],
    ['credentials', 400, 'Bad Request'],
    ['password', 422, 'Unprocessable Entity'],
    ['unauthorized', 403, 'Forbidden'],
    ['notFound', 404, 'Not Found'],
    ['conflict', 409, 'Conflict'],
  ] as const)('maps %s to %s', async (kind, statusCode, error) => {
    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/errors/${kind}`,
    });
    expect(response.statusCode).toBe(statusCode);
    expect(response.json()).toEqual({
      statusCode,
      error,
      message: errors[kind].message,
    });
  });

  it.each(['PATCH', 'DELETE', 'HEAD'])(
    'allows %s in browser preflight',
    async (method) => {
      const response = await app.inject({
        method: 'OPTIONS',
        url: '/api/v1/errors/unexpected',
        headers: {
          origin: 'http://localhost:5173',
          'access-control-request-method': method,
          'access-control-request-headers': 'authorization,content-type',
        },
      });
      expect(response.statusCode).toBe(204);
      expect(response.headers['access-control-allow-origin']).toBe(
        'http://localhost:5173',
      );
      expect(
        response.headers['access-control-allow-methods']?.split(','),
      ).toContain(method);
    },
  );

  it('preserves generic 500 for unexpected failures without private details', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/errors/unexpected',
    });
    expect(response.statusCode).toBe(500);
    expect(response.json()).toEqual({
      statusCode: 500,
      message: 'Internal server error',
    });
  });
});
