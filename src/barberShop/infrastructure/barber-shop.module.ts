import { Module } from '@nestjs/common';

import { BarberShopController } from './barber-shop.controller';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { BarberShopPrismaRepository } from './database/prisma/repositories/barberShop-prisma.repository';
import { CreateBarberShopUseCase } from '../application/usecases/create-barberShop.usecase';
import { BarberShopRepository } from '../domain/repositories/barbershop.repository';
import { UserPrismaRepository } from '@/users/infrastructure/database/prisma/repositories/user-prisma.repository';
import { UserRepository } from '@/users/domain/repositories/user.repository';

@Module({
  controllers: [BarberShopController],
  providers: [
    {
      provide: 'PrismaService',
      useClass: PrismaService,
    },
    {
      provide: 'BarberShopRepository',
      useFactory: (prismaService: PrismaService) => {
        return new BarberShopPrismaRepository(prismaService);
      },
      inject: ['PrismaService'],
    },
    {
      provide: 'UserRepository',
      useFactory: (prismaService: PrismaService) => {
        return new UserPrismaRepository(prismaService);
      },
      inject: ['PrismaService'],
    },
    {
      provide: CreateBarberShopUseCase.UseCase,
      useFactory: (
        barberShopRepository: BarberShopRepository.Repository,
        userRepository: UserRepository.Repository,
      ) => {
        return new CreateBarberShopUseCase.UseCase(
          barberShopRepository,
          userRepository,
        );
      },
      inject: ['BarberShopRepository', 'UserRepository'],
    },
  ],
})
export class BarberShopModule {}
