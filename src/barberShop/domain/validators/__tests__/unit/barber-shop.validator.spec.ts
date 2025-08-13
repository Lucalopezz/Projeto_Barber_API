import { BarberShopProps } from '@/barberShop/domain/entities/barber-shop.entity';
import { BarberShopValidatorFactory } from '../../barber-shop.validator';
import { Address } from '@/barberShop/domain/value-objects/address.vo';
import { randomUUID } from 'node:crypto';

describe('BarberShopValidator', () => {
  const validator = BarberShopValidatorFactory.create();

  const validData: BarberShopProps = {
    name: 'Cut & Shave',
    address: new Address('Rua A, 10, Cidade – ST'),
    ownerId: randomUUID(),
    createdAt: new Date(),
  };

  it('validates correct data', () => {
    expect(validator.validate(validData)).toBe(true);
    expect(validator.errors).toBeNull();
  });

  it('rejects invalid address string', () => {
    const badAddress = 'Rua sem número';
    let isValid = true;

    try {
      const bad = {
        ...validData,
        address: new Address(badAddress),
      };
      isValid = validator.validate(bad);
    } catch (error) {
      expect(error.message).toBe(
        'Address must include street, number, city and state (e.g.: "Street, 123, City – ST")',
      );
      isValid = false;
    }

    expect(isValid).toBe(false);
  });
});
