import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ErrorResponse {
  @ApiPropertyOptional({
    enum: [
      'AUTHENTICATION_REQUIRED',
      'AUTH_SESSION_INVALID',
      'AUTH_SESSION_AMBIGUOUS',
      'AUTH_ORIGIN_REJECTED',
    ],
  })
  code?: string;
  @ApiPropertyOptional({
    type: [String],
    description:
      'Somente SIDs autenticados por cookies em bootstrap ambíguo; nunca identidades ou tokens.',
  })
  sessionIds?: string[];
  @ApiProperty({ example: 404 })
  statusCode: number;

  @ApiProperty({ example: 'Not Found' })
  error: string;

  @ApiProperty({
    oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
    example: 'Resource not found',
  })
  message: string | string[];
}

export class PaginationResponse {
  @ApiProperty({ example: 1 })
  currentPage: number;

  @ApiProperty({ example: 15 })
  perPage: number;

  @ApiProperty({ example: 1 })
  lastPage: number;

  @ApiProperty({ example: 1 })
  total: number;
}

export class AccessTokenResponse {
  @ApiProperty({
    description: 'JWT usado no header Authorization como Bearer token.',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  accessToken: string;
}

export class SessionTokensResponse extends AccessTokenResponse {
  @ApiProperty({ format: 'uuid' })
  sessionId: string;
  @ApiProperty({ format: 'date-time' })
  accessTokenExpiresAt: string;
  @ApiProperty({ format: 'date-time' })
  sessionExpiresAt: string;
}
