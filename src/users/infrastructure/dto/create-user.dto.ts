import { CreateUserUseCase } from '@/users/application/usecases/create-user.usecase';
import { Role } from '@/users/domain/entities/role.enum';
import { IsEmail, IsIn, IsNotEmpty, IsString } from 'class-validator';

export class CreateUserDto implements CreateUserUseCase.Input {
  @IsString()
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsIn([Role.barber, Role.client])
  role: Role;

  @IsString()
  @IsNotEmpty()
  password: string;

  @IsString()
  @IsNotEmpty()
  name: string;
}
