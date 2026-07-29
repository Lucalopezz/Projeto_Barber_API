import { ServiceEntity } from '@/services/domain/entities/services.entity';
import { ServiceDataBuilder } from '@/services/domain/helpers/service-data-builder';
import { ServicesRepository } from '@/services/domain/repositories/services.repository';
import { ListServicesByBarberShopUseCase } from '../../list-services-by-barberShop.usecase';

describe('ListServicesByBarberShopUseCase unit tests', () => {
  const barberShopId = '123e4567-e89b-12d3-a456-426614174000';
  const servicesRepository = {
    search: jest.fn(),
  } as unknown as ServicesRepository.Repository;
  let sut: ListServicesByBarberShopUseCase.UseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    sut = new ListServicesByBarberShopUseCase.UseCase(servicesRepository);
  });

  it('should search services using the barber shop filter and pagination', async () => {
    const service = new ServiceEntity(
      ServiceDataBuilder({ barberShopId }),
    );
    (servicesRepository.search as jest.Mock).mockResolvedValue({
      items: [service],
      total: 1,
      currentPage: 1,
      perPage: 10,
      lastPage: 1,
    });

    const output = await sut.execute({
      barberShopId,
      page: 1,
      perPage: 10,
      sort: 'name',
      sortDir: 'asc',
    });

    expect(servicesRepository.search).toHaveBeenCalledWith(
      expect.objectContaining({
        filter: { barberShopId },
        page: 1,
        perPage: 10,
        sort: 'name',
        sortDir: 'asc',
      }),
    );
    expect(output.items).toEqual([
      expect.objectContaining({ id: service.id, barberShopId }),
    ]);
    expect(output).toEqual(
      expect.objectContaining({
        total: 1,
        currentPage: 1,
        perPage: 10,
        lastPage: 1,
      }),
    );
  });
});
