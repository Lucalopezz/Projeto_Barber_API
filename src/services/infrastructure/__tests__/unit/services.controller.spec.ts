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
    listServicesByBarberShopUseCase.execute.mockResolvedValue([service]);

    const output = await sut.findAll({ barberShopId });

    expect(listServicesByBarberShopUseCase.execute).toHaveBeenCalledWith({
      barberShopId,
    });
    expect(output).toEqual([
      expect.objectContaining({ id: service.id, barberShopId }),
    ]);
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
