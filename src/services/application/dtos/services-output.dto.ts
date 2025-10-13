import { ServiceEntity } from '@/services/domain/entities/services.entity';

export type ServicesOutput = {
  id: string;
  name: string;
  price: number;
  description: string;
  duration: number;
  barberShopId: string;
  createdAt: Date;
};

export class ServicesOutputMapper {
  static toOutput(services: ServiceEntity): ServicesOutput {
    const data = services.toJSON();
    return {
      ...data,
    };
  }
}
