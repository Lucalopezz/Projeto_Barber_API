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
import { DeleteAppointmentUseCase } from '../application/usecases/delete-appointment.usecase';
import { GetAppointmentUseCase } from '../application/usecases/get-appointment.usecase';

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
      provide: CreateAppointmentsUseCase.UseCase,
      useFactory: (
        appointmentRepository: AppointmentsRepository.Repository,
        servicesRepository: ServicesRepository.Repository,
      ) => {
        return new CreateAppointmentsUseCase.UseCase(
          appointmentRepository,
          servicesRepository,
        );
      },
      inject: ['AppointmentRepository', 'ServicesRepository'],
    },
    {
      provide: DeleteAppointmentUseCase.UseCase,
      useFactory: (
        appointmentRepository: AppointmentsRepository.Repository,
      ) => {
        return new DeleteAppointmentUseCase.UseCase(appointmentRepository);
      },
      inject: ['AppointmentRepository'],
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
      ) => {
        return new UpdateStatusUseCase.UseCase(
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
        barberShopRepository: BarberShopRepository.Repository,
      ) => {
        return new UpdateAppointmentUseCase.UseCase(
          appointmentRepository,
          barberShopRepository,
        );
      },
      inject: ['AppointmentRepository', 'BarberShopRepository'],
    },
  ],
})
export class AppointmentsModule {}
