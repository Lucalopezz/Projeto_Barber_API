/* eslint-disable @typescript-eslint/no-unused-vars */
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import { setupPrismaTests } from '@/shared/infrastructure/database/testing/setup-prisma-tests';
import { DatabaseModule } from '@/shared/infrastructure/database/database.module';
import { ListAppointmentsUseCase } from '../../list-appointments.usecase';
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

describe('ListAppointmentsUseCase integration tests', () => {
  const prismaService = new PrismaClient();
  let sut: ListAppointmentsUseCase.UseCase;
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
    sut = new ListAppointmentsUseCase.UseCase(
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
  const createService = async (
    barberShopId: string,
    name = 'Corte de Cabelo',
  ) => {
    const service = new ServiceEntity(
      ServiceDataBuilder({
        barberShopId,
        name,
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
    date = new Date('2025-12-15T10:00:00Z'),
  ) => {
    const appointment = new AppointmentEntity(
      AppointmentDataBuilder({
        clientId,
        serviceId,
        barberShopId,
        date,
      }),
    );

    await prismaService.appointment.create({
      data: appointment.toJSON(),
    });

    return appointment;
  };

  it('should list appointments for a client user', async () => {
    // Arrange
    const { barberShop } = await createBarberShopWithOwner();
    const service = await createService(barberShop._id);
    const client = await createClient();

    const appointment = await createAppointment(
      client.id,
      service._id,
      barberShop._id,
    );

    const input: ListAppointmentsUseCase.Input = {
      userId: client.id,
    };

    // Act
    const output = await sut.execute(input);

    // Assert
    expect(output.items).toHaveLength(1);
    expect(output.items[0].id).toBe(appointment._id);
    expect(output.items[0].clientId).toBe(client.id);
    expect(output.total).toBe(1);
  });

  it('should list appointments for a barber user (by barber shop)', async () => {
    // Arrange
    const { barber, barberShop } = await createBarberShopWithOwner();
    const service = await createService(barberShop._id);
    const client = await createClient();

    const appointment = await createAppointment(
      client.id,
      service._id,
      barberShop._id,
    );

    const input: ListAppointmentsUseCase.Input = {
      userId: barber.id,
    };

    // Act
    const output = await sut.execute(input);

    // Assert
    expect(output.items).toHaveLength(1);
    expect(output.items[0].barberShopId).toBe(barberShop._id);
    expect(output.total).toBe(1);
  });

  it('should return empty list when no appointments exist for client', async () => {
    // Arrange
    const client = await createClient();

    const input: ListAppointmentsUseCase.Input = {
      userId: client.id,
    };

    // Act
    const output = await sut.execute(input);

    // Assert
    expect(output.items).toHaveLength(0);
    expect(output.total).toBe(0);
  });

  it('should apply pagination correctly', async () => {
    // Arrange
    const { barberShop } = await createBarberShopWithOwner();
    const service = await createService(barberShop._id);
    const client = await createClient();

    for (let i = 0; i < 16; i++) {
      await createAppointment(
        client.id,
        service._id,
        barberShop._id,
        new Date(`2025-12-${15 + i}T10:00:00Z`),
      );
    }

    const input: ListAppointmentsUseCase.Input = {
      userId: client.id,
      page: 1,
      perPage: 5,
    };

    // Act
    const output = await sut.execute(input);

    // Assert
    expect(output.items).toHaveLength(5);
    expect(output.total).toBe(16);
    expect(output.currentPage).toBe(1);
    expect(output.perPage).toBe(5);
  });

  it('should filter appointments by service id', async () => {
    // Arrange
    const { barberShop } = await createBarberShopWithOwner();
    const service1 = await createService(barberShop._id, 'Corte');
    const service2 = await createService(barberShop._id, 'Barba');
    const client = await createClient();

    await createAppointment(
      client.id,
      service1._id,
      barberShop._id,
      new Date('2025-12-15T10:00:00Z'),
    );
    await createAppointment(
      client.id,
      service2._id,
      barberShop._id,
      new Date('2025-12-15T11:00:00Z'),
    );

    const input: ListAppointmentsUseCase.Input = {
      userId: client.id,
      serviceID: service1._id,
    };

    // Act
    const output = await sut.execute(input);

    // Assert
    expect(output.items).toHaveLength(1);
    expect(output.items[0].serviceId).toBe(service1._id);
    expect(output.total).toBe(1);
  });

  it('should filter appointments by date', async () => {
    // Arrange
    const { barberShop } = await createBarberShopWithOwner();
    const service = await createService(barberShop._id);
    const client = await createClient();

    const filterDate = new Date('2025-12-15T10:00:00Z');
    await createAppointment(
      client.id,
      service._id,
      barberShop._id,
      new Date('2025-12-15T10:00:00Z'),
    );
    await createAppointment(
      client.id,
      service._id,
      barberShop._id,
      new Date('2025-12-16T10:00:00Z'),
    );

    const input: ListAppointmentsUseCase.Input = {
      userId: client.id,
      date: filterDate,
    };

    // Act
    const output = await sut.execute(input);

    // Assert
    expect(output.items).toHaveLength(1);
    expect(output.total).toBe(1);
  });

  it('should sort appointments by date ascending', async () => {
    // Arrange
    const { barberShop } = await createBarberShopWithOwner();
    const service = await createService(barberShop._id);
    const client = await createClient();

    const date1 = new Date('2025-12-15T10:00:00Z');
    const date2 = new Date('2025-12-20T10:00:00Z');
    const date3 = new Date('2025-12-10T10:00:00Z');

    await createAppointment(client.id, service._id, barberShop._id, date1);
    await createAppointment(client.id, service._id, barberShop._id, date2);
    await createAppointment(client.id, service._id, barberShop._id, date3);

    const input: ListAppointmentsUseCase.Input = {
      userId: client.id,
      sort: 'date',
      sortDir: 'asc',
    };

    // Act
    const output = await sut.execute(input);

    // Assert
    expect(output.items).toHaveLength(3);
    expect(output.items[0].date.toISOString()).toBe(date3.toISOString());
    expect(output.items[1].date.toISOString()).toBe(date1.toISOString());
    expect(output.items[2].date.toISOString()).toBe(date2.toISOString());
  });

  it('should sort appointments by date descending', async () => {
    // Arrange
    const { barberShop } = await createBarberShopWithOwner();
    const service = await createService(barberShop._id);
    const client = await createClient();

    const date1 = new Date('2025-12-15T10:00:00Z');
    const date2 = new Date('2025-12-20T10:00:00Z');
    const date3 = new Date('2025-12-10T10:00:00Z');

    await createAppointment(client.id, service._id, barberShop._id, date1);
    await createAppointment(client.id, service._id, barberShop._id, date2);
    await createAppointment(client.id, service._id, barberShop._id, date3);

    const input: ListAppointmentsUseCase.Input = {
      userId: client.id,
      sort: 'date',
      sortDir: 'desc',
    };

    // Act
    const output = await sut.execute(input);

    // Assert
    expect(output.items).toHaveLength(3);
    expect(output.items[0].date.toISOString()).toBe(date2.toISOString());
    expect(output.items[1].date.toISOString()).toBe(date1.toISOString());
    expect(output.items[2].date.toISOString()).toBe(date3.toISOString());
  });

  it('should apply pagination on second page', async () => {
    // Arrange
    const { barberShop } = await createBarberShopWithOwner();
    const service = await createService(barberShop._id);
    const client = await createClient();

    for (let i = 0; i < 16; i++) {
      await createAppointment(
        client.id,
        service._id,
        barberShop._id,
        new Date(`2025-12-${15 + i}T10:00:00Z`),
      );
    }

    const input: ListAppointmentsUseCase.Input = {
      userId: client.id,
      page: 2,
      perPage: 5,
    };

    // Act
    const output = await sut.execute(input);

    // Assert
    expect(output.items).toHaveLength(5);
    expect(output.currentPage).toBe(2);
    expect(output.total).toBe(16);
  });

  it('should not mix appointments from different clients', async () => {
    // Arrange
    const { barberShop } = await createBarberShopWithOwner();
    const service = await createService(barberShop._id);
    const client1 = await createClient(1);
    const client2 = await createClient(2);

    await createAppointment(
      client1.id,
      service._id,
      barberShop._id,
      new Date('2025-12-15T10:00:00Z'),
    );
    await createAppointment(
      client2.id,
      service._id,
      barberShop._id,
      new Date('2025-12-15T11:00:00Z'),
    );

    const input: ListAppointmentsUseCase.Input = {
      userId: client1.id,
    };

    // Act
    const output = await sut.execute(input);

    // Assert
    expect(output.items).toHaveLength(1);
    expect(output.items[0].clientId).toBe(client1.id);
    expect(output.total).toBe(1);
  });
});
