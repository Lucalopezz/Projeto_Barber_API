import { ListBarberShopUseCase } from '@/barberShop/application/usecases/list-barberShop.usecase';
import { SortDirection } from '@/shared/domain/repositories/searchable.repository';
import { IsOptional } from 'class-validator';

export class ListBarberShopDto implements ListBarberShopUseCase.Input {
  @IsOptional()
  page?: number;

  @IsOptional()
  perPage?: number;

  @IsOptional()
  sort?: string;

  @IsOptional()
  sortDir?: SortDirection;

  @IsOptional()
  filter?: string;
}
