import { BarberShopOutput } from '@/barberShop/application/dtos/barberShop-output.dto';
import { ListBarberShopUseCase } from '@/barberShop/application/usecases/list-barberShop.usecase';
import { Address } from '@/barberShop/domain/value-objects/address.vo';
import { CollectionPresenter } from '@/shared/infrastructure/presenters/collection.presenter';
import { Transform } from 'class-transformer';

export class BarberShopPresenter {
  id: string;
  name: string;
  ownerId: string;

  @Transform(({ value }: { value: Address }) => value.toString())
  address: string;

  @Transform(({ value }: { value: Date }) => value.toISOString())
  createdAt: Date;

  constructor(output: BarberShopOutput) {
    this.id = output.id;
    this.name = output.name;
    this.address = output.address;
    this.ownerId = output.ownerId;
    this.createdAt = output.createdAt;
  }
}

export class BarberShopCollectionPresenter extends CollectionPresenter {
  data: BarberShopPresenter[];
  constructor(output: ListBarberShopUseCase.Output) {
    // Separe itens from the pagination props
    const { items, ...paginationProps } = output;
    super(paginationProps);
    this.data = items.map((item) => new BarberShopPresenter(item));
  }
}
