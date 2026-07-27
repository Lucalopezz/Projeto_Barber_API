import { Reflector } from '@nestjs/core';
import { Role } from '@/users/domain/entities/role.enum';

export const Roles = Reflector.createDecorator<Role[]>();
