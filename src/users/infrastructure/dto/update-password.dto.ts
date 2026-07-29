import { UpdatePasswordUseCase } from '@/users/application/usecases/update-password.usecase';
import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdatePasswordDto
  implements Omit<UpdatePasswordUseCase.Input, 'id' | 'userId'>
{
  @ApiProperty({ example: 'nova-senha-segura' })
  @IsString()
  @IsNotEmpty()
  password: string;

  @ApiProperty({ example: 'senha-atual' })
  @IsString()
  @IsNotEmpty()
  oldPassword: string;
}
