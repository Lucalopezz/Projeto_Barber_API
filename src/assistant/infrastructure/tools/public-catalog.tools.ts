import {
  AssistantReadTools,
  Availability,
  PublicService,
  PublicShop,
} from '../../application/ports/assistant';
import { ListBarberShopUseCase } from '@/barberShop/application/usecases/list-barberShop.usecase';
import { GetBarberShopUseCase } from '@/barberShop/application/usecases/get-barberShop.usecase';
import { ListServicesByBarberShopUseCase } from '@/services/application/usecases/list-services-by-barberShop.usecase';
import { GetPublicAvailabilityUseCase } from '@/barberShop/application/usecases/get-public-availability.usecase';
export class PublicCatalogTools implements AssistantReadTools {
  constructor(
    private readonly catalog: Pick<ListBarberShopUseCase.UseCase, 'execute'>,
    private readonly shop: Pick<GetBarberShopUseCase.UseCase, 'execute'>,
    private readonly services: Pick<
      ListServicesByBarberShopUseCase.UseCase,
      'execute'
    >,
    private readonly availability: Pick<
      GetPublicAvailabilityUseCase.UseCase,
      'execute'
    >,
  ) {}
  async searchCatalog(
    filter: string,
  ): Promise<{ items: PublicShop[]; total: number }> {
    const result = await this.catalog.execute({
      filter,
      page: 1,
      perPage: 20,
      sort: 'name',
      sortDir: 'asc',
    });
    return {
      items: result.items.map(({ id, name, address }) => ({
        id,
        name,
        address,
      })),
      total: result.total,
    };
  }
  async listServices(
    barberShopId: string,
  ): Promise<{ items: PublicService[]; total: number }> {
    await this.shop.execute({ id: barberShopId });
    const result = await this.services.execute({
      barberShopId,
      page: 1,
      perPage: 50,
      sort: 'name',
      sortDir: 'asc',
    });
    return {
      items: result.items.map(
        ({ id, name, description, price, duration, barberShopId }) => ({
          id,
          name,
          description,
          price,
          duration,
          barberShopId,
        }),
      ),
      total: result.total,
    };
  }
  async getAvailability(input: {
    barberShopId: string;
    serviceId: string;
    date: string;
  }): Promise<Availability> {
    const result = await this.availability.execute(input);
    return {
      date: result.date,
      serviceId: result.serviceId,
      timezone: result.timezone,
      slots: result.slots.map(({ startsAt, endsAt }) => ({
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
      })),
    };
  }
}
