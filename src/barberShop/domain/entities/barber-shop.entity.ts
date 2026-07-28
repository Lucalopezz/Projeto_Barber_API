import { Entity } from '@/shared/domain/entities/entity';
import { Address } from '../value-objects/address.vo';
import { BarberShopValidatorFactory } from '../validators/barber-shop.validator';
import { EntityValidationError } from '@/shared/domain/errors/validation-error';

export type BarberShopProps = {
  name: string;
  address: Address;
  createdAt?: Date;
  ownerId: string;
  timezone?: string;
};

export class BarberShopEntity extends Entity<BarberShopProps> {
  constructor(
    public readonly props: BarberShopProps,
    id?: string,
  ) {
    BarberShopEntity.validate(props);
    super(props, id);
    this.props.createdAt = this.props.createdAt ?? new Date();
    this.props.timezone = this.props.timezone ?? 'America/Sao_Paulo';
    BarberShopEntity.validateTimezone(this.props.timezone);
  }

  update(name?: string, address?: Address, timezone?: string): void {
    const updatedProps = {
      ...this.props,
      ...(name !== undefined && { name }),
      ...(address !== undefined && { address }),
      ...(timezone !== undefined && { timezone }),
    };

    BarberShopEntity.validate(updatedProps);

    if (name !== undefined) {
      this.name = name;
    }
    if (address !== undefined) {
      this.address = address;
    }
    if (timezone !== undefined) {
      BarberShopEntity.validateTimezone(timezone);
      this.timezone = timezone;
    }
  }

  get name(): string {
    return this.props.name;
  }
  private set name(value: string) {
    this.props.name = value;
  }
  get ownerId(): string {
    return this.props.ownerId;
  }
  private set ownerId(value: string) {
    this.props.ownerId = value;
  }
  get address(): Address {
    return this.props.address;
  }
  get timezone(): string {
    return this.props.timezone;
  }
  private set timezone(value: string) {
    this.props.timezone = value;
  }

  private static validateTimezone(timezone: string): void {
    try {
      new Intl.DateTimeFormat('en-US', { timeZone: timezone }).format();
    } catch {
      throw new EntityValidationError({
        timezone: ['timezone must be a valid IANA timezone'],
      });
    }
  }
  private set address(value: Address) {
    this.props.address = value;
  }

  static validate(data: BarberShopProps) {
    const shopValidator = BarberShopValidatorFactory.create();
    const isValid = shopValidator.validate(data);
    if (!isValid) {
      throw new EntityValidationError(shopValidator.errors);
    }
  }
}
