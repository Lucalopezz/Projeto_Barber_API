import { Type, applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiExtraModels,
  ApiResponse,
  getSchemaPath,
} from '@nestjs/swagger';
import { ErrorResponse, PaginationResponse } from './openapi.models';

type ErrorStatus = 400 | 401 | 403 | 404 | 409 | 422;

const errorExamples: Record<
  ErrorStatus,
  { description: string; error: string; message: string | string[] }
> = {
  400: {
    description: 'Requisição inválida',
    error: 'Bad Request',
    message: 'Invalid credentials',
  },
  401: {
    description: 'Token ausente ou inválido',
    error: 'Unauthorized',
    message: 'Unauthorized',
  },
  403: {
    description: 'Operação não permitida para o usuário autenticado',
    error: 'Forbidden',
    message: 'Forbidden resource',
  },
  404: {
    description: 'Recurso não encontrado',
    error: 'Not Found',
    message: 'Resource not found',
  },
  409: {
    description: 'Conflito com o estado atual do recurso',
    error: 'Conflict',
    message: 'Resource already exists',
  },
  422: {
    description: 'Payload ou parâmetros inválidos',
    error: 'Unprocessable Entity',
    message: ['field must be valid'],
  },
};

export function ApiErrorResponses(...statuses: ErrorStatus[]) {
  return applyDecorators(
    ApiExtraModels(ErrorResponse),
    ...statuses.map((status) => {
      const example = errorExamples[status];
      return ApiResponse({
        status,
        description: example.description,
        type: ErrorResponse,
        example: {
          statusCode: status,
          error: example.error,
          message: example.message,
        },
      });
    }),
  );
}

export function ApiProtected(...additionalErrors: ErrorStatus[]) {
  return applyDecorators(
    ApiBearerAuth(),
    ApiErrorResponses(401, ...additionalErrors),
  );
}

export function ApiDataResponse(
  model: Type<unknown>,
  status = 200,
  description = 'Operação realizada com sucesso',
) {
  return applyDecorators(
    ApiExtraModels(model),
    ApiResponse({
      status,
      description,
      schema: {
        type: 'object',
        properties: {
          data: { $ref: getSchemaPath(model) },
        },
        required: ['data'],
      },
    }),
  );
}

export function ApiDataArrayResponse(
  model: Type<unknown>,
  status = 200,
  description = 'Operação realizada com sucesso',
) {
  return applyDecorators(
    ApiExtraModels(model),
    ApiResponse({
      status,
      description,
      schema: {
        type: 'object',
        properties: {
          data: {
            type: 'array',
            items: { $ref: getSchemaPath(model) },
          },
        },
        required: ['data'],
      },
    }),
  );
}

export function ApiPaginatedResponse(model: Type<unknown>) {
  return applyDecorators(
    ApiExtraModels(model, PaginationResponse),
    ApiResponse({
      status: 200,
      description: 'Coleção paginada',
      schema: {
        type: 'object',
        properties: {
          data: {
            type: 'array',
            items: { $ref: getSchemaPath(model) },
          },
          meta: { $ref: getSchemaPath(PaginationResponse) },
        },
        required: ['data', 'meta'],
      },
    }),
  );
}
