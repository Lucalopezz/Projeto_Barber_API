import { Test, TestingModule } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import { setupPrismaTests } from '@/shared/infrastructure/database/testing/setup-prisma-tests';
import { DatabaseModule } from '@/shared/infrastructure/database/database.module';
import { BadRequestError } from '@/shared/application/errors/bad-request-error';
import { CreateAppointmentsUseCase } from '../../create-appointment.usecase';
import { AppointmentsPrismaRepository } from '@/appointments/infrastructure/database/prisma/repositories/appointments-prisma.repository';
import { ServicesPrismaRepository } from '@/services/infrastructure/database/prisma/services-prisma.repository';
import { BarberShopPrismaRepository } from '@/barberShop/infrastructure/database/prisma/repositories/barberShop-prisma.repository';
import { UserPrismaRepository } from '@/users/infrastructure/database/prisma/repositories/user-prisma.repository';
import { AppointmentStatus } from '@/appointments/domain/entities/appointmentStatus.enum';
import { UserDataBuilder } from '@/users/domain/helpers/user-data-builder';
import { BarberShopDataBuilder } from '@/barberShop/domain/helpers/barberShop-data-builder';
import { ServiceDataBuilder } from '@/services/domain/helpers/service-data-builder';
import { UserEntity } from '@/users/domain/entities/user.entity';
import { BarberShopEntity } from '@/barberShop/domain/entities/barber-shop.entity';
import { ServiceEntity } from '@/services/domain/entities/services.entity';
import { Role } from '@/users/domain/entities/role.enum';
import { BarberAvailabilityPrismaRepository } from '@/appointments/infrastructure/database/prisma/repositories/barber-availability-prisma.repository';
import { AppointmentAvailabilityService } from '@/appointments/application/services/appointment-availability.service';
import { randomUUID } from 'node:crypto';

describe('CreateAppointmentsUseCase integration tests', () => {
  const prismaService = new PrismaClient();
  let sut: CreateAppointmentsUseCase.UseCase;
  let appointmentRepository: AppointmentsPrismaRepository;
  let serviceRepository: ServicesPrismaRepository;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let barberShopRepository: BarberShopPrismaRepository;
  let userRepository: UserPrismaRepository;
  let availabilityRepository: BarberAvailabilityPrismaRepository;
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
    availabilityRepository = new BarberAvailabilityPrismaRepository(
      prismaService as any,
    );
  });

  beforeEach(async () => {
    sut = new CreateAppointmentsUseCase.UseCase(
      appointmentRepository,
      serviceRepository,
      barberShopRepository,
      new AppointmentAvailabilityService(
        appointmentRepository,
        availabilityRepository,
      ),
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
  const createBarberShopWithOwner = async () => {
    const barber = new UserEntity(
      UserDataBuilder({
        role: Role.owner,
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
    await prismaService.barberSchedule.createMany({
      data: Array.from({ length: 7 }, (_, dayOfWeek) => ({
        id: randomUUID(),
        barberId: barber.id,
        dayOfWeek,
        startMinute: 0,
        endMinute: 1440,
      })),
    });

    return { barber, barberShop };
  };

  // Helper to create service
  const createService = async (barberShopId: string, duration = 30) => {
    const service = new ServiceEntity(
      ServiceDataBuilder({
        barberShopId,
        name: 'Corte de Cabelo',
        price: 50,
        duration,
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

  it('should create an appointment successfully', async () => {
    // Arrange
    const { barber, barberShop } = await createBarberShopWithOwner();
    const service = await createService(barberShop._id);
    const client = await createClient();
    const appointmentDate = new Date('2025-12-15T10:00:00Z');

    const input: CreateAppointmentsUseCase.Input = {
      clientId: client.id,
      serviceId: service._id,
      date: appointmentDate,
    };

    // Act
    const output = await sut.execute(input);

    // Assert
    expect(output.id).toBeDefined();
    expect(output.clientId).toBe(client.id);
    expect(output.serviceId).toBe(service._id);
    expect(output.barberId).toBe(barber.id);
    expect(output.status).toBe(AppointmentStatus.scheduled);
    expect(output.date).toEqual(appointmentDate);
    expect(output.createdAt).toBeInstanceOf(Date);
  });

  it('should throw BadRequestError when service is not found', async () => {
    // Arrange
    const client = await createClient();
    const appointmentDate = new Date('2025-12-15T10:00:00Z');

    const input: CreateAppointmentsUseCase.Input = {
      clientId: client.id,
      serviceId: 'non-existent-service-id',
      date: appointmentDate,
    };

    // Act & Assert
    await expect(sut.execute(input)).rejects.toThrow(
      new BadRequestError('Service not found'),
    );
  });

  it('should throw BadRequestError when appointment is not available', async () => {
    // Arrange
    const { barberShop } = await createBarberShopWithOwner();
    const service = await createService(barberShop._id);
    const client1 = await createClient();
    const client2 = await createClient();
    const appointmentDate = new Date('2025-12-15T10:00:00Z');

    // Create first appointment
    const firstInput: CreateAppointmentsUseCase.Input = {
      clientId: client1.id,
      serviceId: service._id,
      date: appointmentDate,
    };

    await sut.execute(firstInput);

    // Try to create second appointment at same time
    const secondInput: CreateAppointmentsUseCase.Input = {
      clientId: client2.id,
      serviceId: service._id,
      date: appointmentDate,
    };

    // Act & Assert
    await expect(sut.execute(secondInput)).rejects.toThrow(
      new BadRequestError('Appointment not available'),
    );
  });

  it('should reject overlapping appointments from different services', async () => {
    const { barberShop } = await createBarberShopWithOwner();
    const longService = await createService(barberShop._id, 60);
    const otherService = await createService(barberShop._id, 30);
    const client1 = await createClient();
    const client2 = await createClient();
    const start = new Date('2025-12-15T10:00:00Z');

    await sut.execute({
      clientId: client1.id,
      serviceId: longService.id,
      date: start,
    });

    await expect(
      sut.execute({
        clientId: client2.id,
        serviceId: otherService.id,
        date: new Date('2025-12-15T10:30:00Z'),
      }),
    ).rejects.toThrow(new BadRequestError('Appointment not available'));
  });

  it('should not block a slot after an appointment is cancelled', async () => {
    const { barberShop } = await createBarberShopWithOwner();
    const service = await createService(barberShop._id);
    const client1 = await createClient();
    const client2 = await createClient();
    const date = new Date('2025-12-15T10:00:00Z');

    const first = await sut.execute({
      clientId: client1.id,
      serviceId: service.id,
      date,
    });
    await prismaService.appointment.update({
      where: { id: first.id },
      data: { status: AppointmentStatus.cancelled },
    });

    await expect(
      sut.execute({ clientId: client2.id, serviceId: service.id, date }),
    ).resolves.toEqual(
      expect.objectContaining({ status: AppointmentStatus.scheduled }),
    );
  });

  it('should reject appointments outside the barber schedule', async () => {
    const { barber, barberShop } = await createBarberShopWithOwner();
    const service = await createService(barberShop.id);
    const client = await createClient();
    await prismaService.barberSchedule.deleteMany({
      where: { barberId: barber.id },
    });
    await prismaService.barberSchedule.create({
      data: {
        id: randomUUID(),
        barberId: barber.id,
        dayOfWeek: 1,
        startMinute: 600,
        endMinute: 660,
      },
    });

    await expect(
      sut.execute({
        clientId: client.id,
        serviceId: service.id,
        date: new Date('2025-12-15T14:00:00Z'),
      }),
    ).rejects.toThrow(new BadRequestError('Appointment not available'));
  });

  it('should reject appointments during a barber time off', async () => {
    const { barber, barberShop } = await createBarberShopWithOwner();
    const service = await createService(barberShop.id);
    const client = await createClient();
    await prismaService.barberTimeOff.create({
      data: {
        id: randomUUID(),
        barberId: barber.id,
        startsAt: new Date('2025-12-15T12:30:00Z'),
        endsAt: new Date('2025-12-15T13:30:00Z'),
        reason: 'Férias',
      },
    });

    await expect(
      sut.execute({
        clientId: client.id,
        serviceId: service.id,
        date: new Date('2025-12-15T13:00:00Z'),
      }),
    ).rejects.toThrow(new BadRequestError('Appointment not available'));
  });

  it('should create appointment and verify it is persisted in database', async () => {
    // Arrange
    const { barber, barberShop } = await createBarberShopWithOwner();
    const service = await createService(barberShop._id);
    const client = await createClient();
    const appointmentDate = new Date('2025-12-20T14:30:00Z');

    const input: CreateAppointmentsUseCase.Input = {
      clientId: client.id,
      serviceId: service._id,
      date: appointmentDate,
    };

    // Act
    const output = await sut.execute(input);

    // Assert - Verify in database
    const appointmentInDb = await prismaService.appointment.findUnique({
      where: { id: output.id },
    });

    expect(appointmentInDb).toBeDefined();
    expect(appointmentInDb.clientId).toBe(client.id);
    expect(appointmentInDb.serviceId).toBe(service._id);
    expect(appointmentInDb.barberId).toBe(barber.id);
    expect(appointmentInDb.status).toBe(AppointmentStatus.scheduled);
    expect(appointmentInDb.date.toISOString()).toBe(
      appointmentDate.toISOString(),
    );
  });

  it('should create multiple appointments for different clients on same service', async () => {
    // Arrange
    const { barberShop } = await createBarberShopWithOwner();
    const service = await createService(barberShop._id);
    const client1 = await createClient();
    const client2 = await createClient();

    const firstDate = new Date('2025-12-15T10:00:00Z');
    const secondDate = new Date('2025-12-15T11:30:00Z');

    const firstInput: CreateAppointmentsUseCase.Input = {
      clientId: client1.id,
      serviceId: service._id,
      date: firstDate,
    };

    const secondInput: CreateAppointmentsUseCase.Input = {
      clientId: client2.id,
      serviceId: service._id,
      date: secondDate,
    };

    // Act
    const firstOutput = await sut.execute(firstInput);
    const secondOutput = await sut.execute(secondInput);

    // Assert
    expect(firstOutput.id).toBeDefined();
    expect(secondOutput.id).toBeDefined();
    expect(firstOutput.id).not.toBe(secondOutput.id);

    const appointments = await prismaService.appointment.findMany();
    expect(appointments).toHaveLength(2);
  });

  it('should associate appointment with the barbershop owner', async () => {
    // Arrange
    const { barber, barberShop } = await createBarberShopWithOwner();
    const service = await createService(barberShop._id);
    const client = await createClient();
    const appointmentDate = new Date('2025-12-25T09:00:00Z');

    const input: CreateAppointmentsUseCase.Input = {
      clientId: client.id,
      serviceId: service._id,
      date: appointmentDate,
    };

    // Act
    const output = await sut.execute(input);

    // Assert
    expect(output.barberId).toBe(barber.id);
  });
});
