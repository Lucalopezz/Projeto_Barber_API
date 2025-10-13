import { Module } from '@nestjs/common';
import { ServicesController } from './services.controller';
import { AuthModule } from '@/auth/auth.module';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { BarberShopPrismaRepository } from '@/barberShop/infrastructure/database/prisma/repositories/barberShop-prisma.repository';
import { ServicesPrismaRepository } from './database/prisma/services-prisma.repository';
import { CreateServicesUseCase } from '../application/usecases/create-services.usecase';
import { BarberShopRepository } from '@/barberShop/domain/repositories/barbershop.repository';
import { ServicesRepository } from '../domain/repositories/services.repository';

@Module({
  controllers: [ServicesController],
  imports: [AuthModule],
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
      provide: 'ServicesRepository',
      useFactory: (prismaService: PrismaService) => {
        return new ServicesPrismaRepository(prismaService);
      },
      inject: ['PrismaService'],
    },
    {
      provide: CreateServicesUseCase.UseCase,
      useFactory: (
        servicesRepository: ServicesRepository.Repository,
        barberShopRepository: BarberShopRepository.Repository,
      ) => {
        return new CreateServicesUseCase.UseCase(
          servicesRepository,
          barberShopRepository,
        );
      },
      inject: ['ServicesRepository', 'BarberShopRepository'],
    },
  ],
})
export class ServicesModule {}
