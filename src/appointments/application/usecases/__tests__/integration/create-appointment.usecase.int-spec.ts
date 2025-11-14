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

describe('CreateAppointmentsUseCase integration tests', () => {
  const prismaService = new PrismaClient();
  let sut: CreateAppointmentsUseCase.UseCase;
  let appointmentRepository: AppointmentsPrismaRepository;
  let serviceRepository: ServicesPrismaRepository;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
    sut = new CreateAppointmentsUseCase.UseCase(
      appointmentRepository,
      serviceRepository,
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

  it('should create an appointment successfully', async () => {
    // Arrange
    const { barberShop } = await createBarberShopWithOwner();
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
    expect(output.barberShopId).toBe(barberShop._id);
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
      new BadRequestError(
        'ServiceModel not found using ID non-existent-service-id',
      ),
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

  it('should create appointment and verify it is persisted in database', async () => {
    // Arrange
    const { barberShop } = await createBarberShopWithOwner();
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
    expect(appointmentInDb.barberShopId).toBe(barberShop._id);
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

  it('should associate appointment with correct barber shop', async () => {
    // Arrange
    const { barberShop } = await createBarberShopWithOwner();
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
    expect(output.barberShopId).toBe(barberShop._id);
  });
});
