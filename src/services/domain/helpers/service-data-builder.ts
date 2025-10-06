import { faker } from '@faker-js/faker';
import { ServiceProps } from '../entities/services.entity';

type Props = Partial<ServiceProps>;

export function ServiceDataBuilder(props: Props): ServiceProps {
  return {
    name: props.name ?? faker.person.fullName(),
    price: props.price ?? parseFloat(faker.commerce.price()),
    description: props.description ?? faker.lorem.sentence(),
    duration: props.duration ?? faker.number.int({ min: 30, max: 180 }),
    barberShopId: props.barberShopId ?? faker.string.uuid(),
    createdAt: props.createdAt ?? new Date(),
  };
}
