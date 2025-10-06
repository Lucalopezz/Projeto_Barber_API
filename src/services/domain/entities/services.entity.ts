import { Entity } from '@/shared/domain/entities/entity';
import { ServiceValidatorFactory } from '../validators/services.validator';
import { EntityValidationError } from '@/shared/domain/errors/validation-error';

export type ServiceProps = {
  name: string;
  price: number;
  description: string;
  duration: number;
  createdAt?: Date;
  barberShopId: string;
};

export class ServiceEntity extends Entity<ServiceProps> {
  constructor(
    public readonly props: ServiceProps,
    id?: string,
  ) {
    ServiceEntity.validate(props);
    super(props, id);
    this.props.createdAt = this.props.createdAt ?? new Date();
  }

  update(
    name?: string,
    price?: number,
    description?: string,
    duration?: number,
  ): void {
    const updatedProps = {
      ...this.props,
      ...(name !== undefined && { name }),
      ...(price !== undefined && { price }),
      ...(description !== undefined && { description }),
      ...(duration !== undefined && { duration }),
    };

    ServiceEntity.validate(updatedProps);

    if (name !== undefined) {
      this.name = name;
    }
    if (price !== undefined) {
      this.price = price;
    }
    if (description !== undefined) {
      this.description = description;
    }
    if (duration !== undefined) {
      this.duration = duration;
    }
  }

  get name(): string {
    return this.props.name;
  }
  set name(value: string) {
    this.props.name = value;
  }
  get price(): number {
    return this.props.price;
  }
  set price(value: number) {
    this.props.price = value;
  }
  get description(): string {
    return this.props.description;
  }
  set description(value: string) {
    this.props.description = value;
  }
  get duration(): number {
    return this.props.duration;
  }
  set duration(value: number) {
    this.props.duration = value;
  }
  get barberShopId(): string {
    return this.props.barberShopId;
  }
  set barberShopId(value: string) {
    this.props.barberShopId = value;
  }

  static validate(data: ServiceProps) {
    const shopValidator = ServiceValidatorFactory.create();
    const isValid = shopValidator.validate(data);
    if (!isValid) {
      throw new EntityValidationError(shopValidator.errors);
    }
  }
}
