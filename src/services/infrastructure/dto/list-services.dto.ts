import { ListServicesByBarberShopUseCase } from '@/services/application/usecases/list-services-by-barberShop.usecase';
import { SortDirection } from '@/shared/domain/repositories/searchable.repository';
import { IsOptional, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ListServicesDto implements ListServicesByBarberShopUseCase.Input {
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

  @ApiProperty({
    format: 'uuid',
    example: 'd59f3d9e-5bb9-4db0-b9dd-6f61cf4e7279',
  })
  @IsUUID()
  barberShopId: string;
}
