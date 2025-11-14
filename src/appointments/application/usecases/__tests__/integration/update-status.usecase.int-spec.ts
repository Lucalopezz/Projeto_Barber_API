/* eslint-disable @typescript-eslint/no-unused-vars */
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import { setupPrismaTests } from '@/shared/infrastructure/database/testing/setup-prisma-tests';
import { DatabaseModule } from '@/shared/infrastructure/database/database.module';
import { NotFoundError } from '@/shared/domain/errors/not-found-error';
import { UnauthorizedError } from '@/shared/application/errors/unauthorized-error';
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
    );
    await prismaService.appointment.deleteMany();
    await prismaService.service.deleteMany();
    await prismaService.barberShop.deleteMany();
    await prismaService.user.deleteMany();
  });

  afterAll(async () => {
    await module.close();
  });

  // Helper to create barber shop with owner
  const createBarberShopWithOwner = async (email = 'barber@test.com') => {
    const barber = new UserEntity(
      UserDataBuilder({
        role: Role.barber,
        email,
      }),
    );
    await userRepository.insert(barber);

    const barberShop = new BarberShopEntity(
      BarberShopDataBuilder({
        ownerId: barber.id,
        name: 'Test Barber Shop',
      }),
    );

    await prismaService.barberShop.create({
      data: {
        id: barberShop._id,
        name: barberShop.name,
        address: barberShop.address.toString(),
        ownerId: barber.id,
      },
    });

    return { barber, barberShop };
  };

  // Helper to create service
  const createService = async (barberShopId: string) => {
    const service = new ServiceEntity(
      ServiceDataBuilder({
        barberShopId,
        name: 'Corte de Cabelo',
        price: 50,
        duration: 30,
      }),
    );

    await prismaService.service.create({
      data: {
        id: service._id,
        name: service.name,
        description: service.description,
        price: service.price,
        duration: service.duration,
        createdAt: service.createdAt,
        barberShopId,
      },
    });

    return service;
  };

  // Helper to create client
  const createClient = async (index = 0) => {
    const client = new UserEntity(
      UserDataBuilder({
        role: Role.client,
        email: `client${index}${Date.now()}@test.com`,
      }),
    );
    await userRepository.insert(client);
    return client;
  };

  // Helper to create appointment
  const createAppointment = async (
    clientId: string,
    serviceId: string,
    barberShopId: string,
    status = AppointmentStatus.scheduled,
  ) => {
    const appointment = new AppointmentEntity(
      AppointmentDataBuilder({
        clientId,
        serviceId,
        barberShopId,
        status,
      }),
    );

    await prismaService.appointment.create({
      data: appointment.toJSON(),
    });

    return appointment;
  };

  it('should update appointment status from scheduled to completed', async () => {
    // Arrange
    const { barber, barberShop } = await createBarberShopWithOwner();
    const service = await createService(barberShop._id);
    const client = await createClient();

    const appointment = await createAppointment(
      client.id,
      service._id,
      barberShop._id,
      AppointmentStatus.scheduled,
    );

    const input: UpdateStatusUseCase.Input = {
      id: appointment._id,
      newStatus: AppointmentStatus.completed,
      barberId: barber.id,
    };

    // Act
    const output = await sut.execute(input);

    // Assert
    expect(output.id).toBe(appointment._id);
    expect(output.status).toBe(AppointmentStatus.completed);
  });

  it('should update appointment status from scheduled to cancelled', async () => {
    // Arrange
    const { barber, barberShop } = await createBarberShopWithOwner();
    const service = await createService(barberShop._id);
    const client = await createClient();

    const appointment = await createAppointment(
      client.id,
      service._id,
      barberShop._id,
      AppointmentStatus.scheduled,
    );

    const input: UpdateStatusUseCase.Input = {
      id: appointment._id,
      newStatus: AppointmentStatus.cancelled,
      barberId: barber.id,
    };

    // Act
    const output = await sut.execute(input);

    // Assert
    expect(output.status).toBe(AppointmentStatus.cancelled);
  });

  it('should throw NotFoundError when appointment does not exist', async () => {
    // Arrange
    const { barber } = await createBarberShopWithOwner();

    const input: UpdateStatusUseCase.Input = {
      id: 'non-existent-id',
      newStatus: AppointmentStatus.completed,
      barberId: barber.id,
    };

    // Act & Assert
    await expect(sut.execute(input)).rejects.toThrow(
      new NotFoundError('AppointmentModel not found using id non-existent-id'),
    );
  });

  it('should throw UnauthorizedError when barber has no barber shop', async () => {
    // Arrange
    const { barberShop } = await createBarberShopWithOwner();
    const service = await createService(barberShop._id);
    const client = await createClient(1);
    const unauthorizedBarber = await createClient(2);

    const appointment = await createAppointment(
      client.id,
      service._id,
      barberShop._id,
    );

    const input: UpdateStatusUseCase.Input = {
      id: appointment._id,
      newStatus: AppointmentStatus.completed,
      barberId: unauthorizedBarber.id,
    };

    // Act & Assert
    await expect(sut.execute(input)).rejects.toThrow(UnauthorizedError);
  });

  it('should update status and verify in database', async () => {
    // Arrange
    const { barber, barberShop } = await createBarberShopWithOwner();
    const service = await createService(barberShop._id);
    const client = await createClient();

    const appointment = await createAppointment(
      client.id,
      service._id,
      barberShop._id,
      AppointmentStatus.scheduled,
    );

    const input: UpdateStatusUseCase.Input = {
      id: appointment._id,
      newStatus: AppointmentStatus.completed,
      barberId: barber.id,
    };

    // Act
    const output = await sut.execute(input);

    // Assert - Verify in database
    const appointmentInDb = await prismaService.appointment.findUnique({
      where: { id: output.id },
    });

    expect(appointmentInDb).toBeDefined();
    expect(appointmentInDb.status).toBe(AppointmentStatus.completed);
  });

  it('should handle status transition from scheduled to any valid status', async () => {
    // Arrange
    const { barber, barberShop } = await createBarberShopWithOwner();
    const service = await createService(barberShop._id);
    const client = await createClient();

    const appointment = await createAppointment(
      client.id,
      service._id,
      barberShop._id,
      AppointmentStatus.scheduled,
    );

    const statusesToTest = [
      AppointmentStatus.completed,
      AppointmentStatus.cancelled,
    ];

    for (const status of statusesToTest) {
      // Need to create a new appointment for each transition test
      const newAppointment = await createAppointment(
        client.id,
        service._id,
        barberShop._id,
        AppointmentStatus.scheduled,
      );

      const input: UpdateStatusUseCase.Input = {
        id: newAppointment._id,
        newStatus: status,
        barberId: barber.id,
      };

      // Act
      const output = await sut.execute(input);

      // Assert
      expect(output.status).toBe(status);
    }
  });

  it('should maintain other appointment fields after status update', async () => {
    // Arrange
    const { barber, barberShop } = await createBarberShopWithOwner();
    const service = await createService(barberShop._id);
    const client = await createClient();

    const appointment = await createAppointment(
      client.id,
      service._id,
      barberShop._id,
      AppointmentStatus.scheduled,
    );

    const originalDate = appointment.date.toISOString();
    const originalServiceId = appointment.serviceId;
    const originalClientId = appointment.clientId;

    const input: UpdateStatusUseCase.Input = {
      id: appointment._id,
      newStatus: AppointmentStatus.completed,
      barberId: barber.id,
    };

    // Act
    const output = await sut.execute(input);

    // Assert
    expect(output.date.toISOString()).toBe(originalDate);
    expect(output.serviceId).toBe(originalServiceId);
    expect(output.clientId).toBe(originalClientId);
    expect(output.barberShopId).toBe(barberShop._id);
  });

  it('should allow multiple status updates on same appointment', async () => {
    // Arrange
    const { barber, barberShop } = await createBarberShopWithOwner();
    const service = await createService(barberShop._id);
    const client = await createClient();

    const appointment = await createAppointment(
      client.id,
      service._id,
      barberShop._id,
      AppointmentStatus.scheduled,
    );

    // First update: scheduled -> completed
    const firstInput: UpdateStatusUseCase.Input = {
      id: appointment._id,
      newStatus: AppointmentStatus.completed,
      barberId: barber.id,
    };

    const firstOutput = await sut.execute(firstInput);
    expect(firstOutput.status).toBe(AppointmentStatus.completed);

    // Verify it persisted
    const appointmentAfterFirstUpdate =
      await prismaService.appointment.findUnique({
        where: { id: appointment._id },
      });
    expect(appointmentAfterFirstUpdate.status).toBe(
      AppointmentStatus.completed,
    );
  });
});
