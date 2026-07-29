import { ServicesOutput } from '@/services/application/dtos/services-output.dto';
import { ListServicesByBarberShopUseCase } from '@/services/application/usecases/list-services-by-barberShop.usecase';
import { CollectionPresenter } from '@/shared/infrastructure/presenters/collection.presenter';
import { Transform } from 'class-transformer';

export class ServicePresenter {
  id: string;
  name: string;
  price: number;
  description: string;
  duration: number;
  barberShopId: string;

  @Transform(({ value }: { value: Date }) => value.toISOString())
  createdAt: Date;

  constructor(output: ServicesOutput) {
    this.id = output.id;
    this.name = output.name;
    this.price = output.price;
    this.description = output.description;
    this.duration = output.duration;
    this.barberShopId = output.barberShopId;
    this.createdAt = output.createdAt;
  }
}

export class ServicesCollectionPresenter extends CollectionPresenter {
  data: ServicePresenter[];

  constructor(output: ListServicesByBarberShopUseCase.Output) {
    const { items, ...paginationProps } = output;
    super(paginationProps);
    this.data = items.map((item) => new ServicePresenter(item));
  }
}
