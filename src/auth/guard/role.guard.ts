import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Roles } from '../decorators/roles.decorator';
import { Role } from '@/users/domain/entities/role.enum';

type AuthenticatedUser = {
  id: string;
  role?: Role;
};

@Injectable()
export class RoleGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<Role[]>(Roles, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Sem @Roles(...), este guard não impõe nenhuma autorização.
    if (!roles || roles.length === 0) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<{ user?: AuthenticatedUser }>();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException();
    }

    // A role do usuário tem que ser uma das roles especificadas no
    // decorator @Roles(...).
    if (!user.role || !roles.includes(user.role)) {
      throw new ForbiddenException();
    }

    return true;
  }
}
