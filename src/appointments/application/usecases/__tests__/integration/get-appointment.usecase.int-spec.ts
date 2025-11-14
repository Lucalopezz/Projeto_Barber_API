/* eslint-disable @typescript-eslint/no-unused-vars */
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import { setupPrismaTests } from '@/shared/infrastructure/database/testing/setup-prisma-tests';
import { DatabaseModule } from '@/shared/infrastructure/database/database.module';
import { NotFoundError } from '@/shared/domain/errors/not-found-error';
import { GetAppointmentUseCase } from '../../get-appointment.usecase';
import { AppointmentsPrismaRepository } from '@/appointments/infrastructure/database/prisma/repositories/appointments-prisma.repository';
import { ServicesPrismaRepository } from '@/services/infrastructure/database/prisma/services-prisma.repository';
import { BarberShopPrismaRepository } from '@/barberShop/infrastructure/database/prisma/repositories/barberShop-prisma.repository';
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

describe('GetAppointmentUseCase integration tests', () => {
  const prismaService = new PrismaClient();
  let sut: GetAppointmentUseCase.UseCase;
  let appointmentRepository: AppointmentsPrismaRepository;
  let serviceRepository: ServicesPrismaRepository;
  let barberShopRepository: BarberShopPrismaRepository;
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
    serviceRepository = new ServicesPrismaRepository(prismaService as any);
    barberShopRepository = new BarberShopPrismaRepository(prismaService as any);
    userRepository = new UserPrismaRepository(prismaService as any);
  });

  beforeEach(async () => {
    sut = new GetAppointmentUseCase.UseCase(appointmentRepository);
    await prismaService.appointment.deleteMany();
    await prismaService.service.deleteMany();
    await prismaService.barberShop.deleteMany();
    await prismaService.user.deleteMany();
  });

  afterAll(async () => {
    await module.close();
  });

  // Helper to create barber shop with owner
  const createBarberShopWithOwner = async () => {
    const barber = new UserEntity(
      UserDataBuilder({
        role: Role.barber,
        email: 'barber@test.com',
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
  const createClient = async () => {
    const client = new UserEntity(
      UserDataBuilder({
        role: Role.client,
        email: `client${Date.now()}@test.com`,
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
        date: new Date('2025-12-15T10:00:00Z'),
      }),
    );

    await prismaService.appointment.create({
      data: appointment.toJSON(),
    });

    return appointment;
  };

  it('should find an appointment by id when user is the client', async () => {
    // Arrange
    const { barberShop } = await createBarberShopWithOwner();
    const service = await createService(barberShop._id);
    const client = await createClient();
    const appointment = await createAppointment(
      client.id,
      service._id,
      barberShop._id,
    );

    const input: GetAppointmentUseCase.Input = {
      id: appointment._id,
      userId: client.id,
    };

    // Act
    const output = await sut.execute(input);

    // Assert
    expect(output.id).toBe(appointment._id);
    expect(output.clientId).toBe(client.id);
    expect(output.serviceId).toBe(service._id);
    expect(output.barberShopId).toBe(barberShop._id);
    expect(output.status).toBe(AppointmentStatus.scheduled);
    expect(output.createdAt).toBeInstanceOf(Date);
  });

  it('should throw NotFoundError when appointment does not exist', async () => {
    // Arrange
    const client = await createClient();
    const input: GetAppointmentUseCase.Input = {
      id: 'non-existent-id',
      userId: client.id,
    };

    // Act & Assert
    await expect(sut.execute(input)).rejects.toThrow(NotFoundError);
  });

  it('should throw NotFoundError when user is not the client', async () => {
    // Arrange
    const { barberShop } = await createBarberShopWithOwner();
    const service = await createService(barberShop._id);
    const client = await createClient();
    const otherUser = await createClient();

    const appointment = await createAppointment(
      client.id,
      service._id,
      barberShop._id,
    );

    const input: GetAppointmentUseCase.Input = {
      id: appointment._id,
      userId: otherUser.id,
    };

    // Act & Assert
    await expect(sut.execute(input)).rejects.toThrow(
      new NotFoundError('Appointment not found'),
    );
  });

  it('should return all appointment fields correctly', async () => {
    // Arrange
    const { barberShop } = await createBarberShopWithOwner();
    const service = await createService(barberShop._id);
    const client = await createClient();
    const appointmentDate = new Date('2025-12-20T14:30:00Z');

    const appointmentData = AppointmentDataBuilder({
      clientId: client.id,
      serviceId: service._id,
      barberShopId: barberShop._id,
      date: appointmentDate,
      status: AppointmentStatus.scheduled,
    });

    const appointment = new AppointmentEntity(appointmentData);
    await prismaService.appointment.create({
      data: appointment.toJSON(),
    });

    const input: GetAppointmentUseCase.Input = {
      id: appointment._id,
      userId: client.id,
    };

    // Act
    const output = await sut.execute(input);

    // Assert
    expect(output.id).toBe(appointment._id);
    expect(output.clientId).toBe(client.id);
    expect(output.serviceId).toBe(service._id);
    expect(output.barberShopId).toBe(barberShop._id);
    expect(output.status).toBe(AppointmentStatus.scheduled);
    expect(output.date.toISOString()).toBe(appointmentDate.toISOString());
    expect(output.createdAt).toBeInstanceOf(Date);
  });

  it('should retrieve appointment with correct date and status', async () => {
    // Arrange
    const { barberShop } = await createBarberShopWithOwner();
    const service = await createService(barberShop._id);
    const client = await createClient();
    const appointmentDate = new Date('2025-12-25T09:00:00Z');

    const appointmentData = AppointmentDataBuilder({
      clientId: client.id,
      serviceId: service._id,
      barberShopId: barberShop._id,
      date: appointmentDate,
    });

    const appointment = new AppointmentEntity(appointmentData);
    await prismaService.appointment.create({
      data: appointment.toJSON(),
    });

    const input: GetAppointmentUseCase.Input = {
      id: appointment._id,
      userId: client.id,
    };

    // Act
    const output = await sut.execute(input);

    // Assert
    expect(output.date.toISOString()).toBe(appointmentDate.toISOString());
    expect(output.status).toBe(AppointmentStatus.scheduled);
  });
});
