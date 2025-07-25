import { ValidationError } from '@/shared/domain/errors/validation-error';
import { Role } from '@/users/domain/entities/role.enum';
import { UserEntity } from '@/users/domain/entities/user.entity';
import { User } from '@prisma/client';

export class UserModelMapper {
  static toEntity(model: User) {
    const data = {
      name: model.name,
      email: model.email,
      role: model.role as Role,
      password: model.password,
      createdAt: model.createdAt,
    };
    try {
      return new UserEntity(data, model.id);
    } catch {
      throw new ValidationError('An entity not be loaded');
    }
  }
}
