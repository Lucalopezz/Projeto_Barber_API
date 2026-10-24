import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty } from 'class-validator';

export class InviteBarberDto {
  @ApiProperty({ format: 'email', example: 'barber@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;
}
