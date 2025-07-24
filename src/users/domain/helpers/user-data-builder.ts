import { faker } from '@faker-js/faker';
import { UserProps } from '../entities/user.entity';
import { Role } from '../entities/role.enum';

type Props = Partial<UserProps>;

export function UserDataBuilder(props: Props): UserProps {
  return {
    name: props.name ?? faker.person.fullName(),
    email: props.email ?? faker.internet.email(),
    role: props.role ?? faker.helpers.arrayElement(Object.values(Role)),
    password: props.password ?? faker.internet.password(),
    createdAt: props.createdAt ?? new Date(),
  };
}
