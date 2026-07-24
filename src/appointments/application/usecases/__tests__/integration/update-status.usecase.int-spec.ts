import { Test, TestingModule } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import { setupPrismaTests } from '@/shared/infrastructure/database/testing/setup-prisma-tests';
import { DatabaseModule } from '@/shared/infrastructure/database/database.module';
import { NotFoundError } from '@/shared/domain/errors/not-found-error';
import { UnauthorizedError } from '@/shared/application/errors/unauthorized-error';
import { ConflictError } from '@/shared/domain/errors/conflict-error';
import { UpdateStatusUseCase } from '../../update-status.usecase';
import { AppointmentsPrismaRepository } from '@/appointments/infrastructure/database/prisma/repositories/appointments-prisma.repository';
import { BarberShopPrismaRepository } from '@/barberShop/infrastructure/database/prisma/repositories/barberShop-prisma.repository';
import { ServicesPrismaRepository } from '@/services/infrastructure/database/prisma/services-prisma.repository';
import { UserPrismaRepository } from '@/users/infrastructure/database/prisma/repositories/user-prisma.repository';
import { AppointmentStatus } from '@/appointments/domain/entities/appointmentStatus.enum';
import { UserDataBuilder } from '@/users/domain/helpers/user-data-builder';
import { BarberShopDataBuilder } from '@/barberShop/domain/helpers/barberShop-data-builder';
import { ServiceDataBuilder } from '@/services/domain/helpers/service-data-builder';
import { AppointmentDataBuilder } from '@/appointments/domain/helpers/appointment-data-builder';
import { UserEntity } from '@/users/domain/entities/user.entity';
import { BarberShopEntity } from '@/barberShop/domain/entities/barber-shop.entity';
import { ServiceEntity } from '@/services/domain/entities/services.entity';
import { AppointmentEntity } from '@/appointments/domain/entities/appointment.entity';
import { Role } from '@/users/domain/entities/role.enum';

describe('UpdateStatusUseCase integration tests', () => {
  const prismaService = new PrismaClient();
  let sut: UpdateStatusUseCase.UseCase;
  let appointmentRepository: AppointmentsPrismaRepository;
  let barberShopRepository: BarberShopPrismaRepository;
  let serviceRepository: ServicesPrismaRepository;
  let userRepository: UserPrismaRepository;
  let module: TestingModule;

  beforeAll(async () => {
    setupPrismaTests();
    module = await Test.createTestingModule({
      imports: [DatabaseModule.forTest(prismaService)],
    }).compile();
    appointmentRepository = new AppointmentsPrismaRepository(
      prismaService as any,
    );
    barberShopRepository = new BarberShopPrismaRepository(prismaService as any);
    serviceRepository = new ServicesPrismaRepository(prismaService as any);
    userRepository = new UserPrismaRepository(prismaService as any);
  });

  beforeEach(async () => {
    sut = new UpdateStatusUseCase.UseCase(
      appointmentRepository,
      barberShopRepository,
      userRepository,
    );
    await prismaService.appointment.deleteMany();
    await prismaService.service.deleteMany();
    await prismaService.barberShop.deleteMany();
    await prismaService.user.deleteMany();
  });

  afterAll(async () => {
    await module.close();
  });

  const createOwnerWithBarberShop = async (
    email = 'owner@test.com',
  ): Promise<{ owner: UserEntity; barberShop: BarberShopEntity }> => {
    const owner = new UserEntity(
      UserDataBuilder({
        role: Role.owner,
        email,
      }),
    );
    await userRepository.insert(owner);

    const barberShop = new BarberShopEntity(
      BarberShopDataBuilder({
        ownerId: owner.id,
        name: 'Test Barber Shop',
      }),
    );
    await prismaService.barberShop.create({
      data: {
        id: barberShop.id,
        name: barberShop.name,
        address: barberShop.address.toString(),
        ownerId: owner.id,
      },
    });

    return { owner, barberShop };
  };

  const createBarber = async (
    barberShopId: string,
    email = 'barber@test.com',
  ): Promise<UserEntity> => {
    const barber = new UserEntity(
      UserDataBuilder({
        role: Role.barber,
        barberShopId,
        email,
      }),
    );
    await userRepository.insert(barber);
    return barber;
  };

  const createClient = async (email = 'client@test.com') => {
    const client = new UserEntity(
      UserDataBuilder({
        role: Role.client,
        email,
      }),
    );
    await userRepository.insert(client);
    return client;
  };

  const createService = async (barberShopId: string) => {
    const service = new ServiceEntity(
      ServiceDataBuilder({
        barberShopId,
        name: 'Corte de Cabelo',
        price: 50,
        duration: 30,
      }),
    );
    await serviceRepository.insert(service);
    return service;
  };

  const createAppointment = async (input: {
    clientId: string;
    barberId: string;
    barberShopId: string;
    serviceId: string;
    status?: AppointmentStatus;
  }) => {
    const appointment = new AppointmentEntity(
      AppointmentDataBuilder({
        ...input,
        status: input.status ?? AppointmentStatus.scheduled,
      }),
    );
    await appointmentRepository.insert(appointment);
    return appointment;
  };

  it('should allow the assigned owner to complete an appointment', async () => {
    const { owner, barberShop } = await createOwnerWithBarberShop();
    const client = await createClient();
    const service = await createService(barberShop.id);
    const appointment = await createAppointment({
      clientId: client.id,
      barberId: owner.id,
      barberShopId: barberShop.id,
      serviceId: service.id,
    });

    const output = await sut.execute({
      id: appointment.id,
      newStatus: AppointmentStatus.completed,
      userId: owner.id,
    });

    expect(output.status).toBe(AppointmentStatus.completed);
  });

  it('should allow the assigned barber to complete an appointment', async () => {
    const { barberShop } = await createOwnerWithBarberShop();
    const barber = await createBarber(barberShop.id);
    const client = await createClient();
    const service = await createService(barberShop.id);
    const appointment = await createAppointment({
      clientId: client.id,
      barberId: barber.id,
      barberShopId: barberShop.id,
      serviceId: service.id,
    });

    const output = await sut.execute({
      id: appointment.id,
      newStatus: AppointmentStatus.completed,
      userId: barber.id,
    });

    expect(output.status).toBe(AppointmentStatus.completed);
  });

  it('should allow the client to cancel their own appointment without deleting it', async () => {
    const { owner, barberShop } = await createOwnerWithBarberShop();
    const client = await createClient();
    const service = await createService(barberShop.id);
    const appointment = await createAppointment({
      clientId: client.id,
      barberId: owner.id,
      barberShopId: barberShop.id,
      serviceId: service.id,
    });

    const output = await sut.execute({
      id: appointment.id,
      newStatus: AppointmentStatus.cancelled,
      userId: client.id,
    });
    const persistedAppointment =
      await prismaService.appointment.findUniqueOrThrow({
        where: { id: appointment.id },
      });

    expect(output.status).toBe(AppointmentStatus.cancelled);
    expect(persistedAppointment.status).toBe(AppointmentStatus.cancelled);
  });

  it('should allow the assigned professional to cancel an appointment', async () => {
    const { owner, barberShop } = await createOwnerWithBarberShop();
    const client = await createClient();
    const service = await createService(barberShop.id);
    const appointment = await createAppointment({
      clientId: client.id,
      barberId: owner.id,
      barberShopId: barberShop.id,
      serviceId: service.id,
    });

    const output = await sut.execute({
      id: appointment.id,
      newStatus: AppointmentStatus.cancelled,
      userId: owner.id,
    });

    expect(output.status).toBe(AppointmentStatus.cancelled);
  });

  it('should not allow the client to complete an appointment', async () => {
    const { owner, barberShop } = await createOwnerWithBarberShop();
    const client = await createClient();
    const service = await createService(barberShop.id);
    const appointment = await createAppointment({
      clientId: client.id,
      barberId: owner.id,
      barberShopId: barberShop.id,
      serviceId: service.id,
    });

    await expect(
      sut.execute({
        id: appointment.id,
        newStatus: AppointmentStatus.completed,
        userId: client.id,
      }),
    ).rejects.toThrow(
      new UnauthorizedError(
        'You are not authorized to update this appointment',
      ),
    );
  });

  it('should not allow another client to cancel the appointment', async () => {
    const { owner, barberShop } = await createOwnerWithBarberShop();
    const client = await createClient();
    const otherClient = await createClient('other-client@test.com');
    const service = await createService(barberShop.id);
    const appointment = await createAppointment({
      clientId: client.id,
      barberId: owner.id,
      barberShopId: barberShop.id,
      serviceId: service.id,
    });

    await expect(
      sut.execute({
        id: appointment.id,
        newStatus: AppointmentStatus.cancelled,
        userId: otherClient.id,
      }),
    ).rejects.toThrow(UnauthorizedError);
  });

  it('should not allow an unassigned barber from the same barber shop', async () => {
    const { owner, barberShop } = await createOwnerWithBarberShop();
    const barber = await createBarber(barberShop.id);
    const client = await createClient();
    const service = await createService(barberShop.id);
    const appointment = await createAppointment({
      clientId: client.id,
      barberId: owner.id,
      barberShopId: barberShop.id,
      serviceId: service.id,
    });

    await expect(
      sut.execute({
        id: appointment.id,
        newStatus: AppointmentStatus.completed,
        userId: barber.id,
      }),
    ).rejects.toThrow(UnauthorizedError);
  });

  it('should not allow a barber from another barber shop', async () => {
    const { barberShop } = await createOwnerWithBarberShop();
    const { barberShop: otherBarberShop } = await createOwnerWithBarberShop(
      'other-owner@test.com',
    );
    const otherBarber = await createBarber(
      otherBarberShop.id,
      'other-barber@test.com',
    );
    const client = await createClient();
    const service = await createService(barberShop.id);
    const appointment = await createAppointment({
      clientId: client.id,
      barberId: otherBarber.id,
      barberShopId: barberShop.id,
      serviceId: service.id,
    });

    await expect(
      sut.execute({
        id: appointment.id,
        newStatus: AppointmentStatus.completed,
        userId: otherBarber.id,
      }),
    ).rejects.toThrow(UnauthorizedError);
  });

  it('should not allow setting an appointment back to scheduled', async () => {
    const { owner, barberShop } = await createOwnerWithBarberShop();
    const client = await createClient();
    const service = await createService(barberShop.id);
    const appointment = await createAppointment({
      clientId: client.id,
      barberId: owner.id,
      barberShopId: barberShop.id,
      serviceId: service.id,
    });

    await expect(
      sut.execute({
        id: appointment.id,
        newStatus: AppointmentStatus.scheduled,
        userId: owner.id,
      }),
    ).rejects.toThrow(UnauthorizedError);
  });

  it('should not change a completed appointment status', async () => {
    const { owner, barberShop } = await createOwnerWithBarberShop();
    const client = await createClient();
    const service = await createService(barberShop.id);
    const appointment = await createAppointment({
      clientId: client.id,
      barberId: owner.id,
      barberShopId: barberShop.id,
      serviceId: service.id,
      status: AppointmentStatus.completed,
    });

    await expect(
      sut.execute({
        id: appointment.id,
        newStatus: AppointmentStatus.cancelled,
        userId: owner.id,
      }),
    ).rejects.toThrow(
      new ConflictError(
        'Only scheduled appointments can have their status updated',
      ),
    );
  });

  it('should throw NotFoundError when the appointment does not exist', async () => {
    const { owner } = await createOwnerWithBarberShop();

    await expect(
      sut.execute({
        id: 'non-existent-id',
        newStatus: AppointmentStatus.completed,
        userId: owner.id,
      }),
    ).rejects.toThrow(
      new NotFoundError('AppointmentModel not found using id non-existent-id'),
    );
  });
});
