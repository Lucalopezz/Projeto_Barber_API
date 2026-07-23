import { Role } from '@/users/domain/entities/role.enum';
import { UserEntity } from '@/users/domain/entities/user.entity';

export type UserOutput = {
  id: string;
  email: string;
  name: string;
  role: Role;
  password: string;
  createdAt: Date;
};

export class UserOutputMapper {
  static toOutput(user: UserEntity): UserOutput {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      password: user.password,
      createdAt: user.createdAt,
    };
  }
}
