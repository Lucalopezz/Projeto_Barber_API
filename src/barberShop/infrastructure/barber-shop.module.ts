import { AppointmentBookingPolicy } from '@/appointments/application/services/appointment-booking-policy';
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
import { ListShopBarbersUseCase } from '../application/usecases/list-shop-barbers.usecase';
import { ListShopInvitationsUseCase } from '../application/usecases/list-shop-invitations.usecase';
import { ListMyShopInvitationsUseCase } from '../application/usecases/list-my-shop-invitations.usecase';
import { InviteShopBarberUseCase } from '../application/usecases/invite-shop-barber.usecase';
import { RevokeShopInvitationUseCase } from '../application/usecases/revoke-shop-invitation.usecase';
import { AcceptShopInvitationUseCase } from '../application/usecases/accept-shop-invitation.usecase';
import { DeclineShopInvitationUseCase } from '../application/usecases/decline-shop-invitation.usecase';
import { RemoveShopBarberUseCase } from '../application/usecases/remove-shop-barber.usecase';
import { BarberShopStaffRepository } from '../domain/repositories/barber-shop-staff.repository';
import { BarberShopStaffPrismaRepository } from './database/prisma/repositories/barber-shop-staff-prisma.repository';

@Module({
  controllers: [BarberShopController],
  imports: [AuthModule],
  providers: [
    {
      provide: AppointmentBookingPolicy,
      useFactory: () => new AppointmentBookingPolicy(),
    },
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
      provide: 'BarberShopStaffRepository',
      useFactory: (prismaService: PrismaService) =>
        new BarberShopStaffPrismaRepository(prismaService),
      inject: ['PrismaService'],
    },
    {
      provide: ListShopBarbersUseCase.UseCase,
      useFactory: (
        shops: BarberShopRepository.Repository,
        staff: BarberShopStaffRepository.Repository,
      ) => new ListShopBarbersUseCase.UseCase(shops, staff),
      inject: ['BarberShopRepository', 'BarberShopStaffRepository'],
    },
    {
      provide: ListShopInvitationsUseCase.UseCase,
      useFactory: (
        shops: BarberShopRepository.Repository,
        staff: BarberShopStaffRepository.Repository,
      ) => new ListShopInvitationsUseCase.UseCase(shops, staff),
      inject: ['BarberShopRepository', 'BarberShopStaffRepository'],
    },
    {
      provide: ListMyShopInvitationsUseCase.UseCase,
      useFactory: (
        users: UserRepository.Repository,
        staff: BarberShopStaffRepository.Repository,
      ) => new ListMyShopInvitationsUseCase.UseCase(users, staff),
      inject: ['UserRepository', 'BarberShopStaffRepository'],
    },
    {
      provide: InviteShopBarberUseCase.UseCase,
      useFactory: (
        shops: BarberShopRepository.Repository,
        users: UserRepository.Repository,
        staff: BarberShopStaffRepository.Repository,
      ) => new InviteShopBarberUseCase.UseCase(shops, users, staff),
      inject: [
        'BarberShopRepository',
        'UserRepository',
        'BarberShopStaffRepository',
      ],
    },
    {
      provide: RevokeShopInvitationUseCase.UseCase,
      useFactory: (
        shops: BarberShopRepository.Repository,
        staff: BarberShopStaffRepository.Repository,
      ) => new RevokeShopInvitationUseCase.UseCase(shops, staff),
      inject: ['BarberShopRepository', 'BarberShopStaffRepository'],
    },
    {
      provide: AcceptShopInvitationUseCase.UseCase,
      useFactory: (staff: BarberShopStaffRepository.Repository) =>
        new AcceptShopInvitationUseCase.UseCase(staff),
      inject: ['BarberShopStaffRepository'],
    },
    {
      provide: DeclineShopInvitationUseCase.UseCase,
      useFactory: (staff: BarberShopStaffRepository.Repository) =>
        new DeclineShopInvitationUseCase.UseCase(staff),
      inject: ['BarberShopStaffRepository'],
    },
    {
      provide: RemoveShopBarberUseCase.UseCase,
      useFactory: (
        shops: BarberShopRepository.Repository,
        staff: BarberShopStaffRepository.Repository,
      ) => new RemoveShopBarberUseCase.UseCase(shops, staff),
      inject: ['BarberShopRepository', 'BarberShopStaffRepository'],
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
        bookingPolicy: AppointmentBookingPolicy,
      ) =>
        new AppointmentAvailabilityService(
          appointmentRepository,
          availabilityRepository,
          bookingPolicy,
        ),
      inject: [
        'AppointmentRepository',
        'BarberAvailabilityRepository',
        AppointmentBookingPolicy,
      ],
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
        userRepository: UserRepository.Repository,
      ) =>
        new GetPublicAvailabilityUseCase.UseCase(
          barberShopRepository,
          servicesRepository,
          availabilityRepository,
          availabilityService,
          userRepository,
        ),
      inject: [
        'BarberShopRepository',
        'ServicesRepository',
        'BarberAvailabilityRepository',
        AppointmentAvailabilityService,
        'UserRepository',
      ],
    },
  ],
})
export class BarberShopModule {}
