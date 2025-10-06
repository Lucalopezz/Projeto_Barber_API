import { ServiceDataBuilder } from '@/services/domain/helpers/service-data-builder';
import { ServiceEntity, ServiceProps } from '../../services.entity';

describe('Service Entity unit tests', () => {
  let props: ServiceProps;
  let sut: ServiceEntity;

  beforeEach(() => {
    props = ServiceDataBuilder({});
    sut = new ServiceEntity(props);
  });

  it('Constructor should create an instance of Service', () => {
    expect(sut.props.name).toBe(props.name);
    expect(sut.props.price).toBe(props.price);
    expect(sut.props.description).toBe(props.description);
    expect(sut.props.duration).toBe(props.duration);
    expect(sut.props.barberShopId).toBe(props.barberShopId);
    expect(sut.props.createdAt).toBeDefined();
  });

  it('Getter of name field', () => {
    expect(sut.name).toBeDefined();
    expect(sut.name).toEqual(props.name);
  });

  it('Getter of price field', () => {
    expect(sut.price).toBeDefined();
    expect(sut.price).toEqual(props.price);
  });

  it('Getter of description field', () => {
    expect(sut.description).toBeDefined();
    expect(sut.description).toEqual(props.description);
  });

  it('Getter of duration field', () => {
    expect(sut.duration).toBeDefined();
    expect(sut.duration).toEqual(props.duration);
  });

  it('Getter of barberShopId field', () => {
    expect(sut.barberShopId).toBeDefined();
    expect(sut.barberShopId).toEqual(props.barberShopId);
  });

  it('Should update name field', () => {
    const newName = 'New Service Name';
    sut.update(newName);
    expect(sut.name).toEqual(newName);
  });

  it('Should update price field', () => {
    const newPrice = 99.99;
    sut.update(undefined, newPrice);
    expect(sut.price).toEqual(newPrice);
  });

  it('Should update description field', () => {
    const newDescription = 'New service description';
    sut.update(undefined, undefined, newDescription);
    expect(sut.description).toEqual(newDescription);
  });

  it('Should update duration field', () => {
    const newDuration = 120;
    sut.update(undefined, undefined, undefined, newDuration);
    expect(sut.duration).toEqual(newDuration);
  });

  it('Should update multiple fields at once', () => {
    const newName = 'Updated Service';
    const newPrice = 150.0;
    const newDescription = 'Updated description';
    const newDuration = 90;

    sut.update(newName, newPrice, newDescription, newDuration);

    expect(sut.name).toEqual(newName);
    expect(sut.price).toEqual(newPrice);
    expect(sut.description).toEqual(newDescription);
    expect(sut.duration).toEqual(newDuration);
  });

  it('Getter of createdAt field', () => {
    expect(sut.createdAt).toBeDefined();
    expect(sut.createdAt).toBeInstanceOf(Date);
  });
});
