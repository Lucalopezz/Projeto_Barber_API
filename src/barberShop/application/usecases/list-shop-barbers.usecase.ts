import { BarberShopRepository } from '@/barberShop/domain/repositories/barbershop.repository';
import { BarberShopStaffRepository } from '@/barberShop/domain/repositories/barber-shop-staff.repository';
import {
  ShopBarberOutput,
  ShopStaffOutputMapper,
} from '../dtos/shop-staff-output.dto';
import { UseCaseContract } from '@/shared/application/usecases/use-case';
import { requireShop } from './shop-staff-authorization';

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace ListShopBarbersUseCase {
  export type Input = { shopId: string };
  export type Output = ShopBarberOutput[];

  export class UseCase implements UseCaseContract<Input, Output> {
    constructor(
      private readonly shops: BarberShopRepository.Repository,
      private readonly staff: BarberShopStaffRepository.Repository,
    ) {}

    async execute({ shopId }: Input): Promise<Output> {
      await requireShop(this.shops, shopId);
      const barbers = await this.staff.listBarbers(shopId);
      return barbers.map(ShopStaffOutputMapper.barberToOutput);
    }
  }
}
