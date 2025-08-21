import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { validate as uuidValidate } from 'uuid';

export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException('User not found in request');
    }
    if (data) {
      return (user as any)[data];
    }
    return user;
  },
);

export const CurrentUserId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    if (!user && !uuidValidate(user.id)) {
      throw new UnauthorizedException('User not found in request');
    }
    return user?.id ?? null;
  },
);
