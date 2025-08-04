/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';
import { Address } from '../value-objects/address.vo';

@ValidatorConstraint({ name: 'address', async: false })
export class AddressValidator implements ValidatorConstraintInterface {
  validate(value: any, args: ValidationArguments) {
    try {
      new Address(value);
      return true;
    } catch {
      return false;
    }
  }

  defaultMessage(args: ValidationArguments) {
    return 'Address must be in the format "Street, Number, City – ST"';
  }
}
