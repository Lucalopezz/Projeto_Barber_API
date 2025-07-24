import { Entity } from '@/shared/domain/entities/entity';
import { UserValidatorFactory } from '../validators/user.validator';
import { Role } from './role.enum';
import { EntityValidationError } from '@/shared/domain/errors/validation-error';

export type UserProps = {
  name: string;
  email: string;
  role: Role;
  password: string;
  createdAt?: Date;
};

export class UserEntity extends Entity<UserProps> {
  constructor(
    public readonly props: UserProps,
    id?: string,
  ) {
    UserEntity.validade(props);
    super(props, id);
    this.props.createdAt = this.props.createdAt ?? new Date();
  }
  update(name?: string, role?: Role): void {
    const updatedProps = {
      ...this.props,
      ...(name !== undefined && { name }),
      ...(role !== undefined && { role }),
    };

    UserEntity.validade(updatedProps);

    if (name !== undefined) {
      this.name = name;
    }
    if (role !== undefined) {
      this.role = role;
    }
  }
  updatePassword(value: string): void {
    UserEntity.validade({ ...this.props, password: value });
    this.password = value;
  }

  get name(): string {
    return this.props.name;
  }
  private set name(value: string) {
    this.props.name = value;
  }
  get role(): string {
    return this.props.role;
  }
  private set role(value: Role) {
    this.props.role = value;
  }
  get email(): string {
    return this.props.email;
  }
  get password(): string {
    return this.props.password;
  }
  private set password(value: string) {
    this.props.password = value;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }

  static validade(data: UserProps) {
    const userValidator = UserValidatorFactory.create();
    const isValid = userValidator.validate(data);
    if (!isValid) {
      throw new EntityValidationError(userValidator.errors);
    }
  }
}
