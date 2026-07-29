import { IsNotEmpty, IsOptional, IsString, Validate } from 'class-validator';
import { AddressValidator } from '@/barberShop/domain/validators/address.validator';
import { UpdateBarberShopUseCase } from '@/barberShop/application/usecases/update-barberShop.usecase';
import { Address } from '@/barberShop/domain/value-objects/address.vo';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateBarberShopDto
  implements Omit<UpdateBarberShopUseCase.Input, 'id' | 'ownerId'>
{
  @ApiPropertyOptional({
    type: String,
    example: 'Avenida Central, 456, Campinas - SP',
  })
  @IsOptional()
  @Validate(AddressValidator)
  @IsNotEmpty()
  address?: Address;

  @ApiPropertyOptional({ example: 'America/Sao_Paulo' })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional({ example: 'Navalha Fina Centro' })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  name?: string;
}
