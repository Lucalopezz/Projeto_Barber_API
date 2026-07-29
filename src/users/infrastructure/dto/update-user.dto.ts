import { UpdateUserUseCase } from '@/users/application/usecases/update-user.usecase';
import { IsOptional, IsString } from 'class-validator';

export class UpdateUserDto
  implements Omit<UpdateUserUseCase.Input, 'id' | 'userId'>
{
  @IsString()
  @IsOptional()
  name: string;
}
