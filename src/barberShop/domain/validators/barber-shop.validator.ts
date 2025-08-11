import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Validate,
} from 'class-validator';
import { ClassValidatorFields } from '@/shared/domain/validators/class-validator-fields';
import { BarberShopProps } from '../entities/barber-shop.entity';
import { AddressValidator } from './address.validator';

export class BarberShopRules {
  @IsString()
  @IsNotEmpty()
  name: string;

  @Validate(AddressValidator)
  address: string;

  @IsOptional()
  createdAt?: Date;

  @IsUUID()
  ownerId?: string;

  constructor(data: BarberShopProps) {
    Object.assign(this, {
      ...data,
      address: data.address.toString(),
    });
  }
}

export class BarberShopValidator extends ClassValidatorFields<BarberShopRules> {
  validate(data: BarberShopProps): boolean {
    return super.validate(new BarberShopRules(data ?? ({} as BarberShopProps)));
  }
}

export class BarberShopValidatorFactory {
  static create(): BarberShopValidator {
    return new BarberShopValidator();
  }
}
