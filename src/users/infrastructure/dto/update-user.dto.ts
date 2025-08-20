import { UpdateUserUseCase } from '@/users/application/usecases/update-user.usecase';
import { Role } from '@/users/domain/entities/role.enum';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class UpdateUserDto
  implements Omit<UpdateUserUseCase.Input, 'id' | 'userId'>
{
  @IsString()
  @IsOptional()
  name: string;

  @IsOptional()
  @IsEnum(Role)
  role: Role;
}
