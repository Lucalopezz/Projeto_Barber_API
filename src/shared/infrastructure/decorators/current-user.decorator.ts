import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { validate as uuidValidate } from 'uuid';

type AuthenticatedUser = {
  id: string;
};

export const CurrentUserId = createParamDecorator<
  unknown,
  ExecutionContext,
  string
>((_data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest<{ user?: AuthenticatedUser }>();
  const user = request.user;

  if (!user || !uuidValidate(user.id)) {
    throw new UnauthorizedException('User not found in request');
  }

  return user.id;
});
