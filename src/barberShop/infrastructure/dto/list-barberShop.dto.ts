import { ListBarberShopUseCase } from '@/barberShop/application/usecases/list-barberShop.usecase';
import { SortDirection } from '@/shared/domain/repositories/searchable.repository';
import { IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ListBarberShopDto implements ListBarberShopUseCase.Input {
  @ApiPropertyOptional({ example: 1, minimum: 1, type: Number })
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ example: 15, minimum: 1, type: Number })
  @IsOptional()
  perPage?: number;

  @ApiPropertyOptional({ example: 'createdAt' })
  @IsOptional()
  sort?: string;

  @ApiPropertyOptional({ enum: ['asc', 'desc'], example: 'desc' })
  @IsOptional()
  sortDir?: SortDirection;

  @ApiPropertyOptional({ example: 'Navalha' })
  @IsOptional()
  filter?: string;
}
