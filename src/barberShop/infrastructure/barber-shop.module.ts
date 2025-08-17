import { Module } from '@nestjs/common';

import { BarberShopController } from './barber-shop.controller';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { BarberShopPrismaRepository } from './database/prisma/repositories/barberShop-prisma.repository';
import { CreateBarberShopUseCase } from '../application/usecases/create-barberShop.usecase';
import { BarberShopRepository } from '../domain/repositories/barbershop.repository';
import { UserPrismaRepository } from '@/users/infrastructure/database/prisma/repositories/user-prisma.repository';
import { UserRepository } from '@/users/domain/repositories/user.repository';
import { ListBarberShopUseCase } from '../application/usecases/list-barberShop.usecase';
import { GetBarberShopUseCase } from '../application/usecases/get-barberShop.usecase';
import { UpdateBarberShopUseCase } from '../application/usecases/update-barberShop.usecase';

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
    {
      provide: ListBarberShopUseCase.UseCase,
      useFactory: (barberShopRepository: BarberShopRepository.Repository) => {
        return new ListBarberShopUseCase.UseCase(barberShopRepository);
      },
      inject: ['BarberShopRepository'],
    },
    {
      provide: GetBarberShopUseCase.UseCase,
      useFactory: (barberShopRepository: BarberShopRepository.Repository) => {
        return new GetBarberShopUseCase.UseCase(barberShopRepository);
      },
      inject: ['BarberShopRepository'],
    },
    {
      provide: UpdateBarberShopUseCase.UseCase,
      useFactory: (barberShopRepository: BarberShopRepository.Repository) => {
        return new UpdateBarberShopUseCase.UseCase(barberShopRepository);
      },
      inject: ['BarberShopRepository'],
    },
  ],
})
export class BarberShopModule {}
