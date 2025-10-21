import { Module } from '@nestjs/common';
import { AppointmentsController } from './appointments.controller';
import { AuthModule } from '@/auth/auth.module';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { AppointmentsPrismaRepository } from './database/prisma/repositories/appointments-prisma.repository';
import { ServicesPrismaRepository } from '@/services/infrastructure/database/prisma/services-prisma.repository';
import { CreateAppointmentsUseCase } from '../application/usecases/create-appointment.usecase';
import { ServicesRepository } from '@/services/domain/repositories/services.repository';
import { AppointmentsRepository } from '../domain/repositories/appointments.repository';

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
  ],
})
export class AppointmentsModule {}
