import { GUARDS_METADATA } from '@nestjs/common/constants';
import { ServicesController } from '../../services.controller';
import { randomUUID } from 'node:crypto';

describe('ServicesController', () => {
  const barberShopId = randomUUID();
  const service = {
    id: randomUUID(),
    name: 'Corte',
    price: 50,
    description: 'Corte tradicional',
    duration: 30,
    barberShopId,
    createdAt: new Date(),
  };
  const listServicesByBarberShopUseCase = {
    execute: jest.fn(),
  };
  const getServicesUseCase = {
    execute: jest.fn(),
  };
  let sut: ServicesController;

  beforeEach(() => {
    jest.clearAllMocks();
    sut = new ServicesController();
    (sut as any).listServicesByBarberShopUseCase =
      listServicesByBarberShopUseCase;
    (sut as any).getServicesUseCase = getServicesUseCase;
  });

  it('should expose the service list by barber shop without guards', async () => {
    listServicesByBarberShopUseCase.execute.mockResolvedValue({
      items: [service],
      total: 1,
      currentPage: 1,
      perPage: 15,
      lastPage: 1,
    });

    const output = await sut.findAll({
      barberShopId,
      page: 1,
      perPage: 15,
      sort: 'name',
      sortDir: 'asc',
    });

    expect(listServicesByBarberShopUseCase.execute).toHaveBeenCalledWith({
      barberShopId,
      page: 1,
      perPage: 15,
      sort: 'name',
      sortDir: 'asc',
    });
    expect(output.data).toEqual([
      expect.objectContaining({ id: service.id, barberShopId }),
    ]);
    expect(output.meta).toEqual({
      currentPage: 1,
      perPage: 15,
      lastPage: 1,
      total: 1,
    });
    expect(
      Reflect.getMetadata(
        GUARDS_METADATA,
        ServicesController.prototype.findAll,
      ),
    ).toBeUndefined();
  });

  it('should expose individual service details without guards', async () => {
    getServicesUseCase.execute.mockResolvedValue(service);

    const output = await sut.findOne(service.id);

    expect(getServicesUseCase.execute).toHaveBeenCalledWith({ id: service.id });
    expect(output).toEqual(expect.objectContaining({ id: service.id }));
    expect(
      Reflect.getMetadata(
        GUARDS_METADATA,
        ServicesController.prototype.findOne,
      ),
    ).toBeUndefined();
  });
});
