import { Entity } from '@/shared/domain/entities/entity';
import { UserValidatorFactory } from '../validators/user.validator';
import { Role } from './role.enum';

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
    // UserEntity.validade(props);
    super(props, id);
    this.props.createdAt = this.props.createdAt ?? new Date();
  }
  update(value: string): void {
    //UserEntity.validade({ ...this.props, name: value });
    this.name = value;
  }
  updatePassword(value: string): void {
    //UserEntity.validade({ ...this.props, password: value });
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
      throw new Error('Need to implement a proper error ');
    }
  }
}
