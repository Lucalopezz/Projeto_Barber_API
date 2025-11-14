/* eslint-disable @typescript-eslint/no-unused-vars */
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import { setupPrismaTests } from '@/shared/infrastructure/database/testing/setup-prisma-tests';
import { DatabaseModule } from '@/shared/infrastructure/database/database.module';
import { NotFoundError } from '@/shared/domain/errors/not-found-error';
import { UnauthorizedError } from '@/shared/application/errors/unauthorized-error';
import { DeleteAppointmentUseCase } from '../../delete-appointment.usecase';
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

describe('DeleteAppointmentUseCase integration tests', () => {
  const prismaService = new PrismaClient();
  let sut: DeleteAppointmentUseCase.UseCase;
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
    sut = new DeleteAppointmentUseCase.UseCase(appointmentRepository);
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
  ) => {
    const appointment = new AppointmentEntity(
      AppointmentDataBuilder({
        clientId,
        serviceId,
        barberShopId,
      }),
    );

    await prismaService.appointment.create({
      data: appointment.toJSON(),
    });

    return appointment;
  };

  it('should delete an appointment successfully', async () => {
    // Arrange
    const { barberShop } = await createBarberShopWithOwner();
    const service = await createService(barberShop._id);
    const client = await createClient();

    const appointment = await createAppointment(
      client.id,
      service._id,
      barberShop._id,
    );

    const input: DeleteAppointmentUseCase.Input = {
      id: appointment._id,
      userId: client.id,
    };

    // Act
    await sut.execute(input);

    // Assert - Verify deletion
    const deletedAppointment = await prismaService.appointment.findUnique({
      where: { id: appointment._id },
    });
    expect(deletedAppointment).toBeNull();
  });

  it('should throw NotFoundError when appointment does not exist', async () => {
    // Arrange
    const client = await createClient();

    const input: DeleteAppointmentUseCase.Input = {
      id: 'non-existent-id',
      userId: client.id,
    };

    // Act & Assert
    await expect(sut.execute(input)).rejects.toThrow(
      new NotFoundError('AppointmentModel not found using id non-existent-id'),
    );
  });

  it('should throw UnauthorizedError when user is not the client', async () => {
    // Arrange
    const { barberShop } = await createBarberShopWithOwner();
    const service = await createService(barberShop._id);
    const client = await createClient(1);
    const otherUser = await createClient(2);

    const appointment = await createAppointment(
      client.id,
      service._id,
      barberShop._id,
    );

    const input: DeleteAppointmentUseCase.Input = {
      id: appointment._id,
      userId: otherUser.id,
    };

    // Act & Assert
    await expect(sut.execute(input)).rejects.toThrow(
      new UnauthorizedError('Unauthorized'),
    );
  });

  it('should verify appointment is deleted from database', async () => {
    // Arrange
    const { barberShop } = await createBarberShopWithOwner();
    const service = await createService(barberShop._id);
    const client = await createClient();

    const appointment = await createAppointment(
      client.id,
      service._id,
      barberShop._id,
    );

    const appointmentId = appointment._id;

    // Verify it exists before deletion
    const beforeDelete = await prismaService.appointment.findUnique({
      where: { id: appointmentId },
    });
    expect(beforeDelete).toBeDefined();

    const input: DeleteAppointmentUseCase.Input = {
      id: appointmentId,
      userId: client.id,
    };

    // Act
    await sut.execute(input);

    // Assert
    const afterDelete = await prismaService.appointment.findUnique({
      where: { id: appointmentId },
    });
    expect(afterDelete).toBeNull();
  });

  it('should only allow client to delete own appointment', async () => {
    // Arrange
    const { barberShop } = await createBarberShopWithOwner();
    const service = await createService(barberShop._id);
    const client = await createClient(1);
    const otherClient = await createClient(2);

    const appointment = await createAppointment(
      client.id,
      service._id,
      barberShop._id,
    );

    const input: DeleteAppointmentUseCase.Input = {
      id: appointment._id,
      userId: otherClient.id,
    };

    // Act & Assert
    await expect(sut.execute(input)).rejects.toThrow(UnauthorizedError);

    // Verify appointment still exists
    const stillExists = await prismaService.appointment.findUnique({
      where: { id: appointment._id },
    });
    expect(stillExists).toBeDefined();
  });

  it('should delete multiple appointments for same client', async () => {
    // Arrange
    const { barberShop } = await createBarberShopWithOwner();
    const service = await createService(barberShop._id);
    const client = await createClient();

    const appointment1 = await createAppointment(
      client.id,
      service._id,
      barberShop._id,
    );
    const appointment2 = await createAppointment(
      client.id,
      service._id,
      barberShop._id,
    );

    // Act
    await sut.execute({
      id: appointment1._id,
      userId: client.id,
    });

    await sut.execute({
      id: appointment2._id,
      userId: client.id,
    });

    // Assert
    const remaining = await prismaService.appointment.findMany({
      where: { clientId: client.id },
    });
    expect(remaining).toHaveLength(0);
  });

  it('should allow client to delete appointment at any status', async () => {
    // Arrange
    const { barberShop } = await createBarberShopWithOwner();
    const service = await createService(barberShop._id);
    const client = await createClient();

    const appointment = new AppointmentEntity(
      AppointmentDataBuilder({
        clientId: client.id,
        serviceId: service._id,
        barberShopId: barberShop._id,
        status: AppointmentStatus.completed,
      }),
    );

    await prismaService.appointment.create({
      data: appointment.toJSON(),
    });

    const input: DeleteAppointmentUseCase.Input = {
      id: appointment._id,
      userId: client.id,
    };

    // Act
    await sut.execute(input);

    // Assert
    const deleted = await prismaService.appointment.findUnique({
      where: { id: appointment._id },
    });
    expect(deleted).toBeNull();
  });

  it('should not affect other appointments when deleting', async () => {
    // Arrange
    const { barberShop } = await createBarberShopWithOwner();
    const service = await createService(barberShop._id);
    const client1 = await createClient(1);
    const client2 = await createClient(2);

    const appointment1 = await createAppointment(
      client1.id,
      service._id,
      barberShop._id,
    );
    const appointment2 = await createAppointment(
      client2.id,
      service._id,
      barberShop._id,
    );

    const input: DeleteAppointmentUseCase.Input = {
      id: appointment1._id,
      userId: client1.id,
    };

    // Act
    await sut.execute(input);

    // Assert
    const deletedAppointment = await prismaService.appointment.findUnique({
      where: { id: appointment1._id },
    });
    expect(deletedAppointment).toBeNull();

    const otherAppointment = await prismaService.appointment.findUnique({
      where: { id: appointment2._id },
    });
    expect(otherAppointment).toBeDefined();
    expect(otherAppointment.clientId).toBe(client2.id);
  });
});
