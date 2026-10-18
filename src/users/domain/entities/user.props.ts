import type { Role } from './role.enum';

export type UserProps = {
  name: string;
  email: string;
  role: Role;
  password: string;
  barberShopId?: string | null;
  createdAt?: Date;
};
