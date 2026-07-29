import { CreateUserUseCase } from '@/users/application/usecases/create-user.usecase';
import { Role } from '@/users/domain/entities/role.enum';
import { IsEmail, IsIn, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto implements CreateUserUseCase.Input {
  @ApiProperty({ example: 'ana@example.com', format: 'email' })
  @IsString()
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty({ enum: [Role.client, Role.barber], example: Role.client })
  @IsNotEmpty()
  @IsIn([Role.barber, Role.client])
  role: Role;

  @ApiProperty({ example: 'senha-segura', minLength: 1 })
  @IsString()
  @IsNotEmpty()
  password: string;

  @ApiProperty({ example: 'Ana Souza' })
  @IsString()
  @IsNotEmpty()
  name: string;
}
