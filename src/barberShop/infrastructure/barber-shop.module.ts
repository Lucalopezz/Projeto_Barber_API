import { Module } from '@nestjs/common';

import { BarberShopController } from './barber-shop.controller';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { BarberShopPrismaRepository } from './database/prisma/repositories/barberShop-prisma.repository';
import { CreateBarberShopUseCase } from '../application/usecases/create-barberShop.usecase';
import { BarberShopRepository } from '../domain/repositories/barbershop.repository';

@Module({
  controllers: [BarberShopController],
  providers: [
    {
      provide: 'PrismaService',
      useClass: PrismaService,
    },
    {
      provide: 'UserRepository',
      useFactory: (prismaService: PrismaService) => {
        return new BarberShopPrismaRepository(prismaService);
      },
      inject: ['PrismaService'],
    },
    {
      provide: CreateBarberShopUseCase.UseCase,
      useFactory: (barberShopRepository: BarberShopRepository.Repository) => {
        return new CreateBarberShopUseCase.UseCase(barberShopRepository);
      },
      inject: ['UserRepository'],
    },
  ],
})
export class BarberShopModule {}
