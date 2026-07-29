import { SigninUseCase } from '@/users/application/usecases/signin.usecase';

import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SigninDto implements SigninUseCase.Input {
  @ApiProperty({ example: 'ana@example.com', format: 'email' })
  @IsString()
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'senha-segura' })
  @IsString()
  @IsNotEmpty()
  password: string;
}
