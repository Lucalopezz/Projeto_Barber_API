import { BarberShopRepository } from '@/barberShop/domain/repositories/barbershop.repository';
import { UnauthorizedError } from '@/shared/application/errors/unauthorized-error';
import { NotFoundError } from '@/shared/domain/errors/not-found-error';

export async function requireShop(
  shops: BarberShopRepository.Repository,
  shopId: string,
) {
  const shop = await shops.findById(shopId);
  if (!shop) throw new NotFoundError('BarberShop not found');
  return shop;
}

export async function requireShopOwner(
  shops: BarberShopRepository.Repository,
  shopId: string,
  ownerId: string,
) {
  const shop = await requireShop(shops, shopId);
  if (shop.ownerId !== ownerId) {
    throw new UnauthorizedError('Only the shop owner can manage staff');
  }
  return shop;
}
