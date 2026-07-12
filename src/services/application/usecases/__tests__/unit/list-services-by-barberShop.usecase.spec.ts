import { BarberShopRepository } from '@/barberShop/domain/repositories/barbershop.repository';
import { NotFoundError } from '@/shared/domain/errors/not-found-error';
import { ServiceEntity } from '@/services/domain/entities/services.entity';
import { ServiceDataBuilder } from '@/services/domain/helpers/service-data-builder';
import { ServicesRepository } from '@/services/domain/repositories/services.repository';
import { ListServicesByBarberShopUseCase } from '../../list-services-by-barberShop.usecase';

describe('ListServicesByBarberShopUseCase unit tests', () => {
  const barberShopId = '123e4567-e89b-12d3-a456-426614174000';
  const servicesRepository = {
    findAllForBarberShop: jest.fn(),
  } as unknown as ServicesRepository.Repository;
  const barberShopRepository = {
    findById: jest.fn(),
  } as unknown as BarberShopRepository.Repository;
  let sut: ListServicesByBarberShopUseCase.UseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    sut = new ListServicesByBarberShopUseCase.UseCase(
      servicesRepository,
      barberShopRepository,
    );
  });

  it('should list only services from the requested barber shop', async () => {
    const service = new ServiceEntity(
      ServiceDataBuilder({ barberShopId }),
    );
    (barberShopRepository.findById as jest.Mock).mockResolvedValue({
      id: barberShopId,
    });
    (servicesRepository.findAllForBarberShop as jest.Mock).mockResolvedValue([
      service,
    ]);

    const output = await sut.execute({ barberShopId });

    expect(servicesRepository.findAllForBarberShop).toHaveBeenCalledWith(
      barberShopId,
    );
    expect(output).toEqual([
      expect.objectContaining({
        id: service.id,
        barberShopId,
      }),
    ]);
  });

  it('should throw when the requested barber shop does not exist', async () => {
    (barberShopRepository.findById as jest.Mock).mockResolvedValue(null);

    await expect(
      sut.execute({ barberShopId: 'missing-barber-shop-id' }),
    ).rejects.toThrow(new NotFoundError('BarberShop not found'));

    expect(servicesRepository.findAllForBarberShop).not.toHaveBeenCalled();
  });
});
