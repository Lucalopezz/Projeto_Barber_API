import { AppModule } from '@/app.module';
import { applyGlobalConfig } from '@/global-config';
import { EnvConfigService } from '@/shared/infrastructure/env-config/env-config.service';
import { Test } from '@nestjs/testing';
import { OpenAPIObject } from '@nestjs/swagger';
import {
  createOpenApiDocument,
  OPENAPI_JSON_PATH,
  OPENAPI_PATH,
  setupOpenApi,
} from '../../openapi';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';

describe('OpenAPI document', () => {
  let document: OpenAPIObject;
  let app: NestFastifyApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );

    applyGlobalConfig(app, app.get(EnvConfigService));
    document = createOpenApiDocument(app);
    setupOpenApi(app);
    await app.init();
  });

  afterAll(async () => app.close());

  it('serves Swagger UI and the raw OpenAPI contract', async () => {
    const server = app.getHttpAdapter().getInstance();
    const [uiResponse, jsonResponse] = await Promise.all([
      server.inject({ method: 'GET', url: `/${OPENAPI_PATH}` }),
      server.inject({ method: 'GET', url: `/${OPENAPI_JSON_PATH}` }),
    ]);

    expect(uiResponse.statusCode).toBe(200);
    expect(uiResponse.headers['content-type']).toContain('text/html');
    expect(jsonResponse.statusCode).toBe(200);
    expect(jsonResponse.json().openapi).toBe('3.0.0');
  });

  it('publishes all versioned routes with stable operation ids', () => {
    expect(document.paths['/api/v1/users']?.post?.operationId).toBe(
      'UsersController_create',
    );
    expect(
      document.paths['/api/v1/barber-shops/{id}/availability']?.get,
    ).toEqual(definedOperation());
    expect(document.paths['/api/v1/appointments/{id}']?.put).toEqual(
      definedOperation(),
    );

    const operationIds = Object.values(document.paths).flatMap((path) =>
      Object.values(path)
        .map((operation) => operation?.operationId)
        .filter(Boolean),
    );
    expect(new Set(operationIds).size).toBe(operationIds.length);
  });

  it('documents request schemas and examples from HTTP DTOs', () => {
    const schema = document.components?.schemas?.CreateUserDto as {
      required?: string[];
      properties?: Record<string, { example?: unknown; enum?: string[] }>;
    };

    expect(schema.required).toEqual(
      expect.arrayContaining(['email', 'role', 'password', 'name']),
    );
    expect(schema.properties?.email.example).toBe('ana@example.com');
    expect(schema.properties?.role.enum).toEqual(
      expect.arrayContaining(['client', 'barber']),
    );
  });

  it('documents Bearer authentication, response envelopes and errors', () => {
    const operation = document.paths['/api/v1/appointments/{id}']?.put;
    const successSchema = operation?.responses?.['200'] as {
      content?: {
        'application/json'?: {
          schema?: { properties?: { data?: { $ref?: string } } };
        };
      };
    };

    expect(document.components?.securitySchemes?.bearer).toEqual(
      expect.objectContaining({ type: 'http', scheme: 'bearer' }),
    );
    expect(operation?.security).toEqual([{ bearer: [] }]);
    expect(
      successSchema.content?.['application/json']?.schema?.properties?.data,
    ).toEqual({
      $ref: '#/components/schemas/AppointmentPresenter',
    });
    expect(Object.keys(operation?.responses ?? {})).toEqual(
      expect.arrayContaining(['200', '401', '403', '404', '409', '422']),
    );
    expect(operation?.responses?.['422']).toEqual(
      expect.objectContaining({
        content: {
          'application/json': expect.objectContaining({
            example: {
              statusCode: 422,
              error: 'Unprocessable Entity',
              message: ['field must be valid'],
            },
          }),
        },
      }),
    );
  });
});

function definedOperation() {
  return expect.objectContaining({
    operationId: expect.any(String),
    summary: expect.any(String),
    responses: expect.any(Object),
  });
}
