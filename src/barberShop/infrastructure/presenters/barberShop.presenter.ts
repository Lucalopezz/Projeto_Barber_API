import { BarberShopOutput } from '@/barberShop/application/dtos/barberShop-output.dto';
import { ListBarberShopUseCase } from '@/barberShop/application/usecases/list-barberShop.usecase';
import { Address } from '@/barberShop/domain/value-objects/address.vo';
import { CollectionPresenter } from '@/shared/infrastructure/presenters/collection.presenter';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class BarberShopPresenter {
  @ApiProperty({
    format: 'uuid',
    example: 'd59f3d9e-5bb9-4db0-b9dd-6f61cf4e7279',
  })
  id: string;
  @ApiProperty({ example: 'Navalha Fina' })
  name: string;
  @ApiProperty({
    format: 'uuid',
    example: '72eb0d7d-f0a8-4a2b-9ea3-27c8792f4a21',
  })
  ownerId: string;

  @ApiProperty({ example: 'Rua das Flores, 123, Sao Paulo - SP' })
  @Transform(({ value }: { value: Address }) => value.toString())
  address: string;

  @ApiProperty({
    type: String,
    format: 'date-time',
    example: '2026-07-23T12:10:00.000Z',
  })
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
