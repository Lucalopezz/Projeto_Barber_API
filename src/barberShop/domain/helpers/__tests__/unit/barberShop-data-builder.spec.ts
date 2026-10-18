import { faker } from '@faker-js/faker';
import { BarberShopDataBuilder } from '../../barberShop-data-builder';

describe('BarberShopDataBuilder address regression', () => {
  afterEach(() => jest.restoreAllMocks());

  it('generates valid addresses for 100 deterministic samples', () => {
    faker.seed(42);
    for (let sample = 0; sample < 100; sample++) {
      expect(() => BarberShopDataBuilder({})).not.toThrow();
    }
  });

  it('normalizes generated separators without changing explicit address objects', () => {
    jest.spyOn(faker.location, 'street').mockReturnValue('North-South, Road');
    jest.spyOn(faker.location, 'city').mockReturnValue('Baden–Baden');
    const generated = BarberShopDataBuilder({});
    expect(generated.address.getStreet()).toBe('North South Road');
    expect(generated.address.getCity()).toBe('Baden Baden');
    expect(BarberShopDataBuilder({ address: generated.address }).address).toBe(
      generated.address,
    );
  });
});
