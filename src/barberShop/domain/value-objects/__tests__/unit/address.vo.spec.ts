import { Address } from '../../address.vo';

describe('Address Value Object', () => {
  const valid = 'Rua das Flores, 123, São Paulo – SP';

  it('constructs and serializes correctly', () => {
    const vo = new Address(valid);
    expect(vo.getStreet()).toBe('Rua das Flores');
    expect(vo.getNumber()).toBe('123');
    expect(vo.getCity()).toBe('São Paulo');
    expect(vo.getState()).toBe('SP');
    expect(vo.toString()).toBe(valid);
  });

  it('throws if parts < 4', () => {
    expect(() => new Address('Rua só duas partes')).toThrow();
  });

  it('throws if any part is empty', () => {
    expect(() => new Address(' , 123, City – ST')).toThrow();
  });

  it('throws for non-numeric number', () => {
    expect(() => new Address('Street, ABC, City – ST')).toThrow(/number/);
  });

  it('throws for invalid state code', () => {
    expect(() => new Address('Street, 123, City – S')).toThrow(
      /State must be a 2-letter/,
    );
  });
});
