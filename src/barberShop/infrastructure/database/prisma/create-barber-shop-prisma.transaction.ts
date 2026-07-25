import {
  CreateBarberShopTransaction,
  CreateBarberShopTransactionContext,
} from '@/barberShop/application/ports/create-barber-shop.transaction';
import { BarberShopPrismaRepository } from './repositories/barberShop-prisma.repository';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { UserPrismaRepository } from '@/users/infrastructure/database/prisma/repositories/user-prisma.repository';

export class CreateBarberShopPrismaTransaction
  implements CreateBarberShopTransaction
{
  constructor(private prismaService: PrismaService) {}

  async execute<T>(
    work: (context: CreateBarberShopTransactionContext) => Promise<T>,
  ): Promise<T> {
    return this.prismaService.$transaction(async (transaction) => {
      return work({
        barberShopRepository: new BarberShopPrismaRepository(transaction),
        userRepository: new UserPrismaRepository(transaction),
      });
    });
  }
}
