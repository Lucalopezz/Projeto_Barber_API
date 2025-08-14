import { faker } from '@faker-js/faker';
import { BarberShopProps } from '../entities/barber-shop.entity';
import { Address } from '../value-objects/address.vo';

type Props = Partial<BarberShopProps>;

export function BarberShopDataBuilder(props: Props): BarberShopProps {
  const generateValidAddress = () => {
    const street = faker.location.street();
    const number = faker.number.int({ min: 1, max: 9999 }).toString();
    const city = faker.location.city();
    const state = faker.location.state({ abbreviated: true });
    return `${street}, ${number}, ${city} – ${state}`;
  };

  return {
    name: props.name ?? faker.company.name(),
    address: props.address ?? new Address(generateValidAddress()),
    ownerId: props.ownerId ?? faker.string.uuid(),
    createdAt: props.createdAt ?? new Date(),
  };
}
