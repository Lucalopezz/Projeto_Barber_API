import { Module } from '@nestjs/common';
import { AuthModule } from '@/auth/auth.module';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { BarberShopPrismaRepository } from '@/barberShop/infrastructure/database/prisma/repositories/barberShop-prisma.repository';
import { ServicesPrismaRepository } from '@/services/infrastructure/database/prisma/services-prisma.repository';
import { AppointmentsPrismaRepository } from '@/appointments/infrastructure/database/prisma/repositories/appointments-prisma.repository';
import { BarberAvailabilityPrismaRepository } from '@/appointments/infrastructure/database/prisma/repositories/barber-availability-prisma.repository';
import { ListBarberShopUseCase } from '@/barberShop/application/usecases/list-barberShop.usecase';
import { GetBarberShopUseCase } from '@/barberShop/application/usecases/get-barberShop.usecase';
import { ListServicesByBarberShopUseCase } from '@/services/application/usecases/list-services-by-barberShop.usecase';
import { GetPublicAvailabilityUseCase } from '@/barberShop/application/usecases/get-public-availability.usecase';
import { AppointmentAvailabilityService } from '@/appointments/application/services/appointment-availability.service';
import { ChatUseCase } from '../application/usecases/chat.usecase';
import { PublicCatalogTools } from './tools/public-catalog.tools';
import { SimulatedAssistantProvider } from './providers/simulated-assistant.provider';
import { AssistantController } from './assistant.controller';
@Module({
  imports: [AuthModule],
  controllers: [AssistantController],
  providers: [
    {
      provide: ChatUseCase,
      useFactory: (prisma: PrismaService) => {
        const shops = new BarberShopPrismaRepository(prisma);
        const services = new ServicesPrismaRepository(prisma);
        const schedules = new BarberAvailabilityPrismaRepository(prisma);
        const availabilityService = new AppointmentAvailabilityService(
          new AppointmentsPrismaRepository(prisma),
          schedules,
        );
        const tools = new PublicCatalogTools(
          new ListBarberShopUseCase.UseCase(shops),
          new GetBarberShopUseCase.UseCase(shops),
          new ListServicesByBarberShopUseCase.UseCase(services),
          new GetPublicAvailabilityUseCase.UseCase(
            shops,
            services,
            schedules,
            availabilityService,
          ),
        );
        return new ChatUseCase(new SimulatedAssistantProvider(), tools);
      },
      inject: [PrismaService],
    },
  ],
})
export class AssistantModule {}
