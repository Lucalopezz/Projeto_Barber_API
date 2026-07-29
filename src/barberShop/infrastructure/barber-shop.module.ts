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
import { DeleteBarberShopUseCase } from '../application/usecases/delete-barberShop.usecase';
import { AuthModule } from '@/auth/auth.module';
import { CreateBarberShopPrismaTransaction } from './database/prisma/create-barber-shop-prisma.transaction';
import { CreateBarberShopTransaction } from '../application/ports/create-barber-shop.transaction';
import { GetPublicAvailabilityUseCase } from '@/barberShop/application/usecases/get-public-availability.usecase';
import { AppointmentAvailabilityService } from '@/appointments/application/services/appointment-availability.service';
import { AppointmentsRepository } from '@/appointments/domain/repositories/appointments.repository';
import { AppointmentsPrismaRepository } from '@/appointments/infrastructure/database/prisma/repositories/appointments-prisma.repository';
import { BarberAvailabilityRepository } from '@/appointments/domain/repositories/barber-availability.repository';
import { BarberAvailabilityPrismaRepository } from '@/appointments/infrastructure/database/prisma/repositories/barber-availability-prisma.repository';
import { ServicesRepository } from '@/services/domain/repositories/services.repository';
import { ServicesPrismaRepository } from '@/services/infrastructure/database/prisma/services-prisma.repository';

@Module({
  controllers: [BarberShopController],
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
      provide: 'UserRepository',
      useFactory: (prismaService: PrismaService) => {
        return new UserPrismaRepository(prismaService);
      },
      inject: ['PrismaService'],
    },
    {
      provide: 'AppointmentRepository',
      useFactory: (prismaService: PrismaService) =>
        new AppointmentsPrismaRepository(prismaService),
      inject: ['PrismaService'],
    },
    {
      provide: 'BarberAvailabilityRepository',
      useFactory: (prismaService: PrismaService) =>
        new BarberAvailabilityPrismaRepository(prismaService),
      inject: ['PrismaService'],
    },
    {
      provide: 'ServicesRepository',
      useFactory: (prismaService: PrismaService) =>
        new ServicesPrismaRepository(prismaService),
      inject: ['PrismaService'],
    },
    {
      provide: AppointmentAvailabilityService,
      useFactory: (
        appointmentRepository: AppointmentsRepository.Repository,
        availabilityRepository: BarberAvailabilityRepository.Repository,
      ) =>
        new AppointmentAvailabilityService(
          appointmentRepository,
          availabilityRepository,
        ),
      inject: ['AppointmentRepository', 'BarberAvailabilityRepository'],
    },
    {
      provide: 'CreateBarberShopTransaction',
      useFactory: (prismaService: PrismaService) => {
        return new CreateBarberShopPrismaTransaction(prismaService);
      },
      inject: ['PrismaService'],
    },
    {
      provide: CreateBarberShopUseCase.UseCase,
      useFactory: (
        barberShopRepository: BarberShopRepository.Repository,
        userRepository: UserRepository.Repository,
        transaction: CreateBarberShopTransaction,
      ) => {
        return new CreateBarberShopUseCase.UseCase(
          barberShopRepository,
          userRepository,
          transaction,
        );
      },
      inject: [
        'BarberShopRepository',
        'UserRepository',
        'CreateBarberShopTransaction',
      ],
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
    {
      provide: DeleteBarberShopUseCase.UseCase,
      useFactory: (barberShopRepository: BarberShopRepository.Repository) => {
        return new DeleteBarberShopUseCase.UseCase(barberShopRepository);
      },
      inject: ['BarberShopRepository'],
    },
    {
      provide: GetPublicAvailabilityUseCase.UseCase,
      useFactory: (
        barberShopRepository: BarberShopRepository.Repository,
        servicesRepository: ServicesRepository.Repository,
        availabilityRepository: BarberAvailabilityRepository.Repository,
        availabilityService: AppointmentAvailabilityService,
      ) =>
        new GetPublicAvailabilityUseCase.UseCase(
          barberShopRepository,
          servicesRepository,
          availabilityRepository,
          availabilityService,
        ),
      inject: [
        'BarberShopRepository',
        'ServicesRepository',
        'BarberAvailabilityRepository',
        AppointmentAvailabilityService,
      ],
    },
  ],
})
export class BarberShopModule {}
