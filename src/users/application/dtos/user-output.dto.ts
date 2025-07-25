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
    return user.toJSON();
  }
}
