import { ValidationArguments } from 'class-validator';
import { AddressValidator } from '../../address.validator';

describe('AddressValidator', () => {
  const validator = new AddressValidator();
  const valid = 'Rua das Flores, 123, São Paulo – SP';
  const invalids = [
    'Rua sem número', // too few parts
    'Rua, , Cidade – ST', // empty number
    'Rua, 123, Cidade', // missing state
    'Rua, ABC, Cidade – ST', // non-numeric number
    'Rua, 123, Cidade – S', // invalid state code
  ];

  it('should return true for a valid address', () => {
    expect(validator.validate(valid as any, {} as ValidationArguments)).toBe(
      true,
    );
  });

  it.each(invalids)('should return false for invalid address: %s', (input) => {
    expect(validator.validate(input as any, {} as ValidationArguments)).toBe(
      false,
    );
  });

  it('should provide a useful default message', () => {
    expect(validator.defaultMessage({} as ValidationArguments)).toMatch(
      /format "Street, Number, City – ST"/,
    );
  });
});
