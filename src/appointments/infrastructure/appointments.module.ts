import { Module } from '@nestjs/common';
import { AppointmentsController } from './appointments.controller';
import { AuthModule } from '@/auth/auth.module';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { AppointmentsPrismaRepository } from './database/prisma/repositories/appointments-prisma.repository';
import { ServicesPrismaRepository } from '@/services/infrastructure/database/prisma/services-prisma.repository';
import { CreateAppointmentsUseCase } from '../application/usecases/create-appointment.usecase';
import { ServicesRepository } from '@/services/domain/repositories/services.repository';
import { AppointmentsRepository } from '../domain/repositories/appointments.repository';
import { UpdateStatusUseCase } from '../application/usecases/update-status.usecase';
import { BarberShopRepository } from '@/barberShop/domain/repositories/barbershop.repository';
import { BarberShopPrismaRepository } from '@/barberShop/infrastructure/database/prisma/repositories/barberShop-prisma.repository';
import { UpdateAppointmentUseCase } from '../application/usecases/update-appointment.usecase';
import { GetAppointmentUseCase } from '../application/usecases/get-appointment.usecase';
import { ListAppointmentsUseCase } from '../application/usecases/list-appointments.usecase';
import { UserRepository } from '@/users/domain/repositories/user.repository';
import { UserPrismaRepository } from '@/users/infrastructure/database/prisma/repositories/user-prisma.repository';
import { AppointmentAvailabilityService } from '../application/services/appointment-availability.service';
import { BarberAvailabilityPrismaRepository } from './database/prisma/repositories/barber-availability-prisma.repository';
import { BarberAvailabilityRepository } from '../domain/repositories/barber-availability.repository';
import { GetBarberAvailabilityUseCase } from '../application/usecases/get-barber-availability.usecase';
import { UpdateBarberScheduleUseCase } from '../application/usecases/update-barber-schedule.usecase';
import { CreateBarberTimeOffUseCase } from '../application/usecases/create-barber-time-off.usecase';
import { DeleteBarberTimeOffUseCase } from '../application/usecases/delete-barber-time-off.usecase';

@Module({
  controllers: [AppointmentsController],
  imports: [AuthModule],
  providers: [
    {
      provide: 'PrismaService',
      useClass: PrismaService,
    },
    {
      provide: 'AppointmentRepository',
      useFactory: (prismaService: PrismaService) => {
        return new AppointmentsPrismaRepository(prismaService);
      },
      inject: ['PrismaService'],
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
      provide: 'UserRepository',
      useFactory: (prismaService: PrismaService) => {
        return new UserPrismaRepository(prismaService);
      },
      inject: ['PrismaService'],
    },
    {
      provide: 'BarberAvailabilityRepository',
      useFactory: (prismaService: PrismaService) =>
        new BarberAvailabilityPrismaRepository(prismaService),
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
      provide: CreateAppointmentsUseCase.UseCase,
      useFactory: (
        appointmentRepository: AppointmentsRepository.Repository,
        servicesRepository: ServicesRepository.Repository,
        barberShopRepository: BarberShopRepository.Repository,
        availabilityService: AppointmentAvailabilityService,
      ) => {
        return new CreateAppointmentsUseCase.UseCase(
          appointmentRepository,
          servicesRepository,
          barberShopRepository,
          availabilityService,
        );
      },
      inject: [
        'AppointmentRepository',
        'ServicesRepository',
        'BarberShopRepository',
        AppointmentAvailabilityService,
      ],
    },
    {
      provide: GetBarberAvailabilityUseCase.UseCase,
      useFactory: (
        userRepository: UserRepository.Repository,
        barberShopRepository: BarberShopRepository.Repository,
        availabilityRepository: BarberAvailabilityRepository.Repository,
      ) =>
        new GetBarberAvailabilityUseCase.UseCase(
          userRepository,
          barberShopRepository,
          availabilityRepository,
        ),
      inject: [
        'UserRepository',
        'BarberShopRepository',
        'BarberAvailabilityRepository',
      ],
    },
    {
      provide: UpdateBarberScheduleUseCase.UseCase,
      useFactory: (
        userRepository: UserRepository.Repository,
        availabilityRepository: BarberAvailabilityRepository.Repository,
      ) =>
        new UpdateBarberScheduleUseCase.UseCase(
          userRepository,
          availabilityRepository,
        ),
      inject: ['UserRepository', 'BarberAvailabilityRepository'],
    },
    {
      provide: CreateBarberTimeOffUseCase.UseCase,
      useFactory: (
        userRepository: UserRepository.Repository,
        availabilityRepository: BarberAvailabilityRepository.Repository,
      ) =>
        new CreateBarberTimeOffUseCase.UseCase(
          userRepository,
          availabilityRepository,
        ),
      inject: ['UserRepository', 'BarberAvailabilityRepository'],
    },
    {
      provide: DeleteBarberTimeOffUseCase.UseCase,
      useFactory: (
        userRepository: UserRepository.Repository,
        availabilityRepository: BarberAvailabilityRepository.Repository,
      ) =>
        new DeleteBarberTimeOffUseCase.UseCase(
          userRepository,
          availabilityRepository,
        ),
      inject: ['UserRepository', 'BarberAvailabilityRepository'],
    },
    {
      provide: GetAppointmentUseCase.UseCase,
      useFactory: (
        appointmentRepository: AppointmentsRepository.Repository,
      ) => {
        return new GetAppointmentUseCase.UseCase(appointmentRepository);
      },
      inject: ['AppointmentRepository'],
    },
    {
      provide: UpdateStatusUseCase.UseCase,
      useFactory: (
        appointmentRepository: AppointmentsRepository.Repository,
        barberShopRepository: BarberShopRepository.Repository,
        userRepository: UserRepository.Repository,
      ) => {
        return new UpdateStatusUseCase.UseCase(
          appointmentRepository,
          barberShopRepository,
          userRepository,
        );
      },
      inject: [
        'AppointmentRepository',
        'BarberShopRepository',
        'UserRepository',
      ],
    },
    {
      provide: ListAppointmentsUseCase.UseCase,
      useFactory: (
        appointmentRepository: AppointmentsRepository.Repository,
        barberShopRepository: BarberShopRepository.Repository,
      ) => {
        return new ListAppointmentsUseCase.UseCase(
          appointmentRepository,
          barberShopRepository,
        );
      },
      inject: ['AppointmentRepository', 'BarberShopRepository'],
    },
    {
      provide: UpdateAppointmentUseCase.UseCase,
      useFactory: (
        appointmentRepository: AppointmentsRepository.Repository,
        serviceRepository: ServicesRepository.Repository,
        userRepository: UserRepository.Repository,
        barberShopRepository: BarberShopRepository.Repository,
        availabilityService: AppointmentAvailabilityService,
      ) => {
        return new UpdateAppointmentUseCase.UseCase(
          appointmentRepository,
          serviceRepository,
          userRepository,
          barberShopRepository,
          availabilityService,
        );
      },
      inject: [
        'AppointmentRepository',
        'ServicesRepository',
        'UserRepository',
        'BarberShopRepository',
        AppointmentAvailabilityService,
      ],
    },
  ],
})
export class AppointmentsModule {}
