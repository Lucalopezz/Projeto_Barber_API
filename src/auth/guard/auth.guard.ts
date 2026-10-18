import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from '../auth.service';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { Role } from '@/users/domain/entities/role.enum';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly authService: AuthService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);
    if (!token) {
      throw new UnauthorizedException();
    }
    let claims: { id?: unknown };
    try {
      claims = await this.authService.verifyJwt(token);
    } catch {
      throw new UnauthorizedException();
    }
    if (!claims || typeof claims.id !== 'string' || !claims.id) {
      throw new UnauthorizedException();
    }

    // A verified token identifies the account; persisted roles authorize requests.
    // Deletion and role changes must take effect before the JWT expires.
    const user = await this.prisma.user.findUnique({
      where: { id: claims.id },
      select: { id: true, role: true },
    });
    if (!user || !Object.values(Role).includes(user.role as Role)) {
      throw new UnauthorizedException();
    }
    request['user'] = user;
    return true;
  }

  private extractTokenFromHeader(request: any): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
