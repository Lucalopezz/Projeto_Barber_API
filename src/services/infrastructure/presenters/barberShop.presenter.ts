import { ServicesOutput } from '@/services/application/dtos/services-output.dto';
import { Transform } from 'class-transformer';

export class ServicePresenter {
  id: string;
  name: string;
  price: number;
  description: string;
  duration: number;
  barberShopOwnerId: string;

  @Transform(({ value }: { value: Date }) => value.toISOString())
  createdAt: Date;

  constructor(output: ServicesOutput) {
    this.id = output.id;
    this.name = output.name;
    this.price = output.price;
    this.description = output.description;
    this.duration = output.duration;
    this.barberShopOwnerId = output.barberShopId;
    this.createdAt = output.createdAt;
  }
}

// Services dont have a search method, so no collection presenter is needed
