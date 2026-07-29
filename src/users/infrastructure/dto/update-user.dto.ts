import { UpdateUserUseCase } from '@/users/application/usecases/update-user.usecase';
import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateUserDto
  implements Omit<UpdateUserUseCase.Input, 'id' | 'userId'>
{
  @ApiPropertyOptional({ example: 'Ana Souza' })
  @IsString()
  @IsOptional()
  name: string;
}
