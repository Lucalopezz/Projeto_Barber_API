import { ServicesOutput } from '@/services/application/dtos/services-output.dto';
import { ListServicesByBarberShopUseCase } from '@/services/application/usecases/list-services-by-barberShop.usecase';
import { CollectionPresenter } from '@/shared/infrastructure/presenters/collection.presenter';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class ServicePresenter {
  @ApiProperty({
    format: 'uuid',
    example: 'a53b9480-a2a7-418f-a2f0-30ed79062d80',
  })
  id: string;
  @ApiProperty({ example: 'Corte degradê' })
  name: string;
  @ApiProperty({ example: 55 })
  price: number;
  @ApiProperty({ example: 'Corte com acabamento à navalha' })
  description: string;
  @ApiProperty({ example: 45, description: 'Duração em minutos.' })
  duration: number;
  @ApiProperty({
    format: 'uuid',
    example: 'd59f3d9e-5bb9-4db0-b9dd-6f61cf4e7279',
  })
  barberShopId: string;

  @ApiProperty({
    type: String,
    format: 'date-time',
    example: '2026-07-23T12:20:00.000Z',
  })
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
