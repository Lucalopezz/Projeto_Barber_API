import { ListServicesByBarberShopUseCase } from '@/services/application/usecases/list-services-by-barberShop.usecase';
import { SortDirection } from '@/shared/domain/repositories/searchable.repository';
import { IsOptional, IsUUID } from 'class-validator';

export class ListServicesDto implements ListServicesByBarberShopUseCase.Input {
  @IsOptional()
  page?: number;

  @IsOptional()
  perPage?: number;

  @IsOptional()
  sort?: string;

  @IsOptional()
  sortDir?: SortDirection;

  @IsUUID()
  barberShopId: string;
}
