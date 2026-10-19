import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from '../auth.service';
import { Inject } from '@nestjs/common';
import { SessionRepository } from '@/auth/domain/repositories/session.repository';
import { Role } from '@/users/domain/entities/role.enum';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly authService: AuthService,
    @Inject('SessionRepository') private readonly sessions: SessionRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);
    if (!token) {
      throw new UnauthorizedException({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Unauthorized',
        code: 'AUTHENTICATION_REQUIRED',
      });
    }
    let claims: { id?: unknown; sid?: unknown };
    try {
      claims = await this.authService.verifyJwt(token);
    } catch {
      throw new UnauthorizedException({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Unauthorized',
        code: 'AUTHENTICATION_REQUIRED',
      });
    }
    if (
      !claims ||
      typeof claims.id !== 'string' ||
      !claims.id ||
      typeof claims.sid !== 'string' ||
      !claims.sid
    ) {
      throw new UnauthorizedException({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Unauthorized',
        code: 'AUTHENTICATION_REQUIRED',
      });
    }

    // A verified token identifies the account; persisted roles authorize requests.
    // Deletion and role changes must take effect before the JWT expires.
    const session = await this.sessions.active(
      claims.sid as string,
      claims.id,
      new Date(),
    );
    const user = session ? { id: session.userId, role: session.role } : null;
    if (!user || !Object.values(Role).includes(user.role as Role)) {
      throw new UnauthorizedException({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Unauthorized',
        code: 'AUTHENTICATION_REQUIRED',
      });
    }
    request['user'] = user;
    return true;
  }

  private extractTokenFromHeader(request: any): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
