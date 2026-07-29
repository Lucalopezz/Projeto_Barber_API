import { ListServicesByBarberShopUseCase } from '@/services/application/usecases/list-services-by-barberShop.usecase';
import { IsUUID } from 'class-validator';

export class ListServicesDto implements ListServicesByBarberShopUseCase.Input {
  @IsUUID()
  barberShopId: string;
}
