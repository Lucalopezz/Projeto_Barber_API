import {
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@/users/domain/entities/role.enum';
import { RoleGuard } from '../../role.guard';

describe('RoleGuard unit tests', () => {
  let reflector: { getAllAndOverride: jest.Mock };
  let guard: RoleGuard;
  let context: ExecutionContext;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    };
    guard = new RoleGuard(reflector as unknown as Reflector);
    context = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({
          user: { id: 'user-id', role: Role.barber },
        }),
      }),
    } as unknown as ExecutionContext;
  });

  it('allows access when no roles are required', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);

    expect(guard.canActivate(context)).toBe(true);
  });

  it('allows access when the authenticated user has a required role', () => {
    reflector.getAllAndOverride.mockReturnValue([Role.barber]);

    expect(guard.canActivate(context)).toBe(true);
  });

  it('throws UnauthorizedException when a restricted route has no user', () => {
    reflector.getAllAndOverride.mockReturnValue([Role.barber]);
    (context.switchToHttp().getRequest as jest.Mock).mockReturnValue({});

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('throws ForbiddenException when the user has no required role', () => {
    reflector.getAllAndOverride.mockReturnValue([Role.owner]);

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });
});
