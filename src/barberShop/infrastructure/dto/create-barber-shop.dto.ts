import { CreateBarberShopUseCase } from '@/barberShop/application/usecases/create-barberShop.usecase';
import { AddressValidator } from '@/barberShop/domain/validators/address.validator';
import { Address } from '@/barberShop/domain/value-objects/address.vo';
import { IsNotEmpty, IsOptional, IsString, Validate } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBarberShopDto
  implements Omit<CreateBarberShopUseCase.Input, 'ownerId'>
{
  @ApiProperty({
    type: String,
    example: 'Rua das Flores, 123, Sao Paulo - SP',
  })
  @Validate(AddressValidator)
  @IsNotEmpty()
  address: Address;

  @ApiProperty({ example: 'Navalha Fina' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({
    example: 'America/Sao_Paulo',
    default: 'America/Sao_Paulo',
  })
  @IsOptional()
  @IsString()
  timezone?: string;
}
