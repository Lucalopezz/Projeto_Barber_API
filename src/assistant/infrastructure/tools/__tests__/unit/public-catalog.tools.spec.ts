import { PublicCatalogTools } from '../../public-catalog.tools';
const shop = '11111111-1111-4111-8111-111111111111';
const service = '22222222-2222-4222-8222-222222222222';
describe('Public assistant tools boundaries', () => {
  const catalog = { execute: jest.fn() };
  const getShop = { execute: jest.fn() };
  const services = { execute: jest.fn() };
  const availability = { execute: jest.fn() };
  let sut: PublicCatalogTools;
  beforeEach(() => {
    jest.resetAllMocks();
    sut = new PublicCatalogTools(catalog, getShop, services, availability);
  });
  it('projects only catalog public fields and bounds pagination', async () => {
    catalog.execute.mockResolvedValue({
      items: [
        {
          id: shop,
          name: 'Shop',
          address: 'Rua',
          ownerId: 'private',
          password: 'private',
        },
      ],
      total: 40,
    });
    expect(await sut.searchCatalog('Shop')).toEqual({
      items: [{ id: shop, name: 'Shop', address: 'Rua' }],
      total: 40,
    });
    expect(catalog.execute).toHaveBeenCalledWith({
      filter: 'Shop',
      page: 1,
      perPage: 20,
      sort: 'name',
      sortDir: 'asc',
    });
  });
  it('checks shop existence before querying services', async () => {
    getShop.execute.mockRejectedValue(new Error('Not found'));
    await expect(sut.listServices(shop)).rejects.toThrow('Not found');
    expect(services.execute).not.toHaveBeenCalled();
  });
  it('projects only public service fields', async () => {
    const data = {
      id: service,
      name: 'Corte',
      description: 'Curto',
      price: 50,
      duration: 30,
      barberShopId: shop,
    };
    services.execute.mockResolvedValue({
      items: [{ ...data, ownerId: 'private' }],
      total: 1,
    });
    expect(await sut.listServices(shop)).toEqual({ items: [data], total: 1 });
  });
  it('availability projection cannot leak additional internal fields', async () => {
    const slot = {
      startsAt: new Date('2026-12-01T12:00:00Z'),
      endsAt: new Date('2026-12-01T12:30:00Z'),
    };
    availability.execute.mockResolvedValue({
      date: '2026-12-01',
      serviceId: service,
      timezone: 'America/Sao_Paulo',
      slots: [slot],
      clientId: 'private',
    });
    expect(
      await sut.getAvailability({
        barberShopId: shop,
        serviceId: service,
        date: '2026-12-01',
      }),
    ).toEqual({
      date: '2026-12-01',
      serviceId: service,
      timezone: 'America/Sao_Paulo',
      slots: [
        {
          startsAt: slot.startsAt.toISOString(),
          endsAt: slot.endsAt.toISOString(),
        },
      ],
    });
  });
});
