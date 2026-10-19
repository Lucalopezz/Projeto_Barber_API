import {
  Injectable,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { FastifyRequest, FastifyReply } from 'fastify';
import { EnvConfigService } from '@/shared/infrastructure/env-config/env-config.service';
import {
  SessionUseCase,
  SessionAmbiguousError,
} from '@/auth/application/session.usecase';
import { AuthService } from '@/auth/auth.service';
import { SessionIdentity } from '@/auth/domain/repositories/session.repository';

const UUID =
  '[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}';
const COOKIE = new RegExp(`^barber_refresh_(${UUID})=([A-Za-z0-9_-]{43})$`);
@Injectable()
export class SessionHttpService {
  constructor(
    private config: EnvConfigService,
    private sessions: SessionUseCase,
    private auth: AuthService,
  ) {}
  validate(request: FastifyRequest, cookieOperation: boolean) {
    const origin = request.headers.origin;
    if (
      !String(request.headers['content-type'] ?? '')
        .toLowerCase()
        .match(/^application\/json(?:\s*;|$)/) ||
      (cookieOperation && request.headers['x-barber-session'] !== '1') ||
      (origin !== undefined &&
        (origin === 'null' ||
          !this.config.getCorsAllowedOrigins().includes(origin))) ||
      (origin === undefined && request.headers['sec-fetch-site'] !== undefined)
    ) {
      throw new ForbiddenException({
        statusCode: 403,
        error: 'Forbidden',
        message: 'Origin or session header rejected',
        code: 'AUTH_ORIGIN_REJECTED',
      });
    }
  }
  cookies(request: FastifyRequest) {
    const result = new Map<string, string>();
    const value = request.headers.cookie ?? '';
    if (value.length > 16384) return result;
    const parts = value.split(';');
    if (parts.length > 64) return result;
    const duplicates = new Set<string>();
    for (const part of parts) {
      const match = COOKIE.exec(part.trim());
      if (!match) continue;
      const [, id, token] = match;
      if (result.has(id)) {
        duplicates.add(id);
        continue;
      }
      result.set(id, token);
    }
    for (const id of duplicates) result.delete(id);
    return result;
  }
  private cookie(sid: string, value: string, expiresAt: Date) {
    const maxAge = Math.max(
      0,
      Math.floor((expiresAt.getTime() - Date.now()) / 1000),
    );
    return `barber_refresh_${sid}=${value}; Max-Age=${maxAge}; Expires=${expiresAt.toUTCString()}; Path=/api/v1/auth; HttpOnly; SameSite=Lax${this.config.getAuthCookieSecure() ? '; Secure' : ''}`;
  }
  clear(reply: FastifyReply, sid: string) {
    reply.header('Set-Cookie', this.cookie(sid, '', new Date(0)));
  }
  async respond(
    reply: FastifyReply,
    result: { session: SessionIdentity; refreshToken: string },
  ) {
    const { session, refreshToken } = result;
    const issued = await this.auth.generateJwt(
      session.userId,
      session.role,
      session.id,
      session.expiresAt,
    );
    reply.header(
      'Set-Cookie',
      this.cookie(session.id, refreshToken, session.expiresAt),
    );
    reply.header('Cache-Control', 'no-store');
    return {
      ...issued,
      sessionId: session.id,
      sessionExpiresAt: session.expiresAt.toISOString(),
    };
  }
  async login(
    request: FastifyRequest,
    reply: FastifyReply,
    user: { id: string; password: string },
  ) {
    const result = await this.sessions.start(user.id, user.password);
    if (!result)
      throw new UnauthorizedException({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Session invalid',
        code: 'AUTH_SESSION_INVALID',
      });
    return this.respond(reply, result);
  }
  async refresh(request: FastifyRequest, reply: FastifyReply, sid?: string) {
    this.validate(request, true);
    let result: Awaited<ReturnType<SessionUseCase['refresh']>>;
    try {
      result = await this.sessions.refresh(this.cookies(request), sid);
    } catch (error) {
      if (error instanceof SessionAmbiguousError)
        throw new UnauthorizedException({
          statusCode: 401,
          error: 'Unauthorized',
          message: 'Select a session or end the authenticated sessions',
          code: 'AUTH_SESSION_AMBIGUOUS',
          sessionIds: error.sessionIds,
        });
      throw error;
    }
    if (!result) {
      if (sid) this.clear(reply, sid);
      throw new UnauthorizedException({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Session invalid',
        code: 'AUTH_SESSION_INVALID',
      });
    }
    return this.respond(reply, result);
  }
  async logout(request: FastifyRequest, reply: FastifyReply, sid: string) {
    this.validate(request, true);
    await this.sessions.logout(sid, this.cookies(request));
    this.clear(reply, sid);
    reply.header('Cache-Control', 'no-store');
  }
}
