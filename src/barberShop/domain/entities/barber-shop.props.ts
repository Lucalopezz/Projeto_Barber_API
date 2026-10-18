import type { Address } from '../value-objects/address.vo';

export type BarberShopProps = {
  name: string;
  address: Address;
  createdAt?: Date;
  ownerId: string;
  timezone?: string;
};
