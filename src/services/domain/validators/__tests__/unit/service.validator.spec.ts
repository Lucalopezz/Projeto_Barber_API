import {
  ServiceValidator,
  ServiceValidatorFactory,
  ServicesRules,
} from '../../services.validator';
import { ServiceDataBuilder } from '@/services/domain/helpers/service-data-builder';
import { ServiceProps } from '@/services/domain/entities/services.entity';

let sut: ServiceValidator;
let props: ServiceProps;

describe('ServiceValidator unit tests', () => {
  beforeEach(() => {
    sut = ServiceValidatorFactory.create();
    props = ServiceDataBuilder({});
  });

  it('Invalidation cases for name field', () => {
    let isValid = sut.validate(null as any);
    expect(isValid).toBeFalsy();
    expect(sut.errors['name']).toStrictEqual([
      'name should not be empty',
      'name must be a string',
      'name must be shorter than or equal to 255 characters',
    ]);

    isValid = sut.validate({ ...props, name: '' });
    expect(isValid).toBeFalsy();
    expect(sut.errors['name']).toStrictEqual(['name should not be empty']);

    isValid = sut.validate({ ...props, name: 10 as any });
    expect(isValid).toBeFalsy();
    expect(sut.errors['name']).toStrictEqual([
      'name must be a string',
      'name must be shorter than or equal to 255 characters',
    ]);

    isValid = sut.validate({ ...props, name: 'a'.repeat(256) });
    expect(isValid).toBeFalsy();
    expect(sut.errors['name']).toStrictEqual([
      'name must be shorter than or equal to 255 characters',
    ]);
  });

  it('Invalidation cases for price field', () => {
    let isValid = sut.validate(null as any);
    expect(isValid).toBeFalsy();
    expect(sut.errors['price']).toStrictEqual([
      'price must be a number conforming to the specified constraints',
      'price should not be empty',
    ]);

    isValid = sut.validate({ ...props, price: '' as any });
    expect(isValid).toBeFalsy();
    expect(sut.errors['price']).toStrictEqual([
      'price must be a number conforming to the specified constraints',
      'price should not be empty',
    ]);

    isValid = sut.validate({ ...props, price: 'invalid' as any });
    expect(isValid).toBeFalsy();
    expect(sut.errors['price']).toStrictEqual([
      'price must be a number conforming to the specified constraints',
    ]);
  });

  it('Invalidation cases for description field', () => {
    let isValid = sut.validate(null as any);
    expect(isValid).toBeFalsy();
    expect(sut.errors['description']).toStrictEqual([
      'description should not be empty',
      'description must be a string',
      'description must be shorter than or equal to 500 characters',
    ]);

    isValid = sut.validate({ ...props, description: '' });
    expect(isValid).toBeFalsy();
    expect(sut.errors['description']).toStrictEqual([
      'description should not be empty',
    ]);

    isValid = sut.validate({ ...props, description: 10 as any });
    expect(isValid).toBeFalsy();
    expect(sut.errors['description']).toStrictEqual([
      'description must be a string',
      'description must be shorter than or equal to 500 characters',
    ]);

    isValid = sut.validate({ ...props, description: 'a'.repeat(501) });
    expect(isValid).toBeFalsy();
    expect(sut.errors['description']).toStrictEqual([
      'description must be shorter than or equal to 500 characters',
    ]);
  });

  it('Invalidation cases for duration field', () => {
    let isValid = sut.validate(null as any);
    expect(isValid).toBeFalsy();
    expect(sut.errors['duration']).toStrictEqual([
      'duration must be a number conforming to the specified constraints',
      'duration should not be empty',
    ]);

    isValid = sut.validate({ ...props, duration: '' as any });
    expect(isValid).toBeFalsy();
    expect(sut.errors['duration']).toStrictEqual([
      'duration must be a number conforming to the specified constraints',
      'duration should not be empty',
    ]);

    isValid = sut.validate({ ...props, duration: 'invalid' as any });
    expect(isValid).toBeFalsy();
    expect(sut.errors['duration']).toStrictEqual([
      'duration must be a number conforming to the specified constraints',
    ]);
  });

  it('Invalidation cases for barberShopId field', () => {
    let isValid = sut.validate(null as any);
    expect(isValid).toBeFalsy();
    expect(sut.errors['barberShopId']).toStrictEqual([
      'barberShopId must be a UUID',
      'barberShopId should not be empty',
    ]);

    isValid = sut.validate({ ...props, barberShopId: '' });
    expect(isValid).toBeFalsy();
    expect(sut.errors['barberShopId']).toStrictEqual([
      'barberShopId must be a UUID',
      'barberShopId should not be empty',
    ]);

    isValid = sut.validate({ ...props, barberShopId: 'invalid-uuid' });
    expect(isValid).toBeFalsy();
    expect(sut.errors['barberShopId']).toStrictEqual([
      'barberShopId must be a UUID',
    ]);

    isValid = sut.validate({ ...props, barberShopId: 123 as any });
    expect(isValid).toBeFalsy();
    expect(sut.errors['barberShopId']).toStrictEqual([
      'barberShopId must be a UUID',
    ]);
  });

  it('Invalidation cases for createdAt field', () => {
    let isValid = sut.validate({ ...props, createdAt: 10 as any });
    expect(isValid).toBeFalsy();
    expect(sut.errors['createdAt']).toStrictEqual([
      'createdAt must be a Date instance',
    ]);

    isValid = sut.validate({ ...props, createdAt: '2023' as any });
    expect(isValid).toBeFalsy();
    expect(sut.errors['createdAt']).toStrictEqual([
      'createdAt must be a Date instance',
    ]);
  });

  it('Valid case for service rules', () => {
    const isValid = sut.validate(props);
    expect(isValid).toBeTruthy();
    expect(sut.validatedData).toStrictEqual(new ServicesRules(props));
  });
});
