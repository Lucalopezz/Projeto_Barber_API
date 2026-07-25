import { BarberShopRepository } from '@/barberShop/domain/repositories/barbershop.repository';
import { UserRepository } from '@/users/domain/repositories/user.repository';

export type CreateBarberShopTransactionContext = {
  barberShopRepository: BarberShopRepository.Repository;
  userRepository: UserRepository.Repository;
};

export interface CreateBarberShopTransaction {
  execute<T>(
    work: (context: CreateBarberShopTransactionContext) => Promise<T>,
  ): Promise<T>;
}
