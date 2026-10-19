import { Body, Controller, HttpCode, Post, Req, Res } from '@nestjs/common';
import {
  ApiConsumes,
  ApiHeader,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { FastifyReply, FastifyRequest } from 'fastify';
import { SessionTokensResponse } from '@/shared/infrastructure/openapi/openapi.models';
import { ApiErrorResponses } from '@/shared/infrastructure/openapi/openapi.decorators';
import { SessionHttpService } from './session-http.service';
import { LogoutSessionDto, RefreshSessionDto } from './dto/session.dto';

@Controller('auth')
@ApiTags('Sessões')
@ApiConsumes('application/json')
@ApiHeader({
  name: 'X-Barber-Session',
  required: true,
  enum: ['1'],
  description: 'Proteção CSRF; Origin deve pertencer à allowlist.',
})
export class AuthController {
  constructor(private sessions: SessionHttpService) {}
  @Post('refresh')
  @HttpCode(200)
  @ApiOperation({
    summary:
      'Restaurar ou renovar sessão; rotaciona cookie HttpOnly sem prolongar prazo absoluto',
  })
  @ApiResponse({
    status: 200,
    type: SessionTokensResponse,
    description: 'Cookie somente do SID renovado; sem envelope',
  })
  @ApiErrorResponses(401, 403, 422)
  refresh(
    @Body() body: RefreshSessionDto,
    @Req() request: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    return this.sessions.refresh(request, reply, body.sessionId);
  }
  @Post('logout')
  @HttpCode(204)
  @ApiOperation({
    summary:
      'Revogar sessão e expirar somente o cookie correspondente; idempotente',
  })
  @ApiResponse({ status: 204, description: 'Sessão alvo encerrada' })
  @ApiErrorResponses(403, 422)
  logout(
    @Body() body: LogoutSessionDto,
    @Req() request: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    return this.sessions.logout(request, reply, body.sessionId);
  }
}
