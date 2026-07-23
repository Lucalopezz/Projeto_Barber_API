import { instanceToPlain } from 'class-transformer';
import { ServicePresenter } from '../../barberShop.presenter';

describe('ServicePresenter unit tests', () => {
  const createdAt = new Date('2026-07-22T12:00:00.000Z');
  const output = {
    id: 'e71c52a2-9710-4a96-a08e-144af4209b5d',
    name: 'Corte',
    price: 55,
    description: 'Corte com acabamento',
    duration: 45,
    barberShopId: 'd4255494-f981-4d26-a2a1-35d3f5b8d36a',
    createdAt,
  };

  it('exposes the canonical barber shop ID', () => {
    const sut = new ServicePresenter(output);

    expect(instanceToPlain(sut)).toStrictEqual({
      id: output.id,
      name: output.name,
      price: output.price,
      description: output.description,
      duration: output.duration,
      barberShopId: output.barberShopId,
      createdAt: createdAt.toISOString(),
    });
  });
});
