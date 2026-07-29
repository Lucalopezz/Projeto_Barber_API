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
import { randomUUID } from 'node:crypto';

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
    sut = new GetAppointmentUseCase.UseCase(
      appointmentRepository,
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

  // Helper to create barber shop with owner
  const createBarberShopWithOwner = async () => {
    const owner = new UserEntity(
      UserDataBuilder({
        role: Role.owner,
        email: 'barber@test.com',
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
        id: barberShop._id,
        name: barberShop.name,
        address: barberShop.address.toString(),
        ownerId: owner.id,
      },
    });
    await prismaService.user.update({
      where: { id: owner.id },
      data: { barberShopId: barberShop.id },
    });

    return { owner, barberShop };
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
        email: `client-${randomUUID()}@test.com`,
      }),
    );
    await userRepository.insert(client);
    return client;
  };

  const createBarber = async (barberShopId: string, email: string) => {
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

  // Helper to create appointment
  const createAppointment = async (
    clientId: string,
    serviceId: string,
    barberShopId: string,
    barberId: string,
  ) => {
    const appointment = new AppointmentEntity(
      AppointmentDataBuilder({
        clientId,
        serviceId,
        barberShopId,
        barberId,
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
    const { owner, barberShop } = await createBarberShopWithOwner();
    const service = await createService(barberShop._id);
    const client = await createClient();
    const appointment = await createAppointment(
      client.id,
      service._id,
      barberShop._id,
      owner.id,
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
    const { owner, barberShop } = await createBarberShopWithOwner();
    const service = await createService(barberShop._id);
    const client = await createClient();
    const otherUser = await createClient();

    const appointment = await createAppointment(
      client.id,
      service._id,
      barberShop._id,
      owner.id,
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

  it('should allow the barber shop owner to read its appointment', async () => {
    const { owner, barberShop } = await createBarberShopWithOwner();
    const service = await createService(barberShop.id);
    const client = await createClient();
    const assignedBarber = await createBarber(
      barberShop.id,
      'assigned-owner-test@test.com',
    );
    const appointment = await createAppointment(
      client.id,
      service.id,
      barberShop.id,
      assignedBarber.id,
    );

    await expect(
      sut.execute({ id: appointment.id, userId: owner.id }),
    ).resolves.toEqual(expect.objectContaining({ id: appointment.id }));
  });

  it('should allow the assigned barber to read the appointment', async () => {
    const { barberShop } = await createBarberShopWithOwner();
    const service = await createService(barberShop.id);
    const client = await createClient();
    const assignedBarber = await createBarber(
      barberShop.id,
      'assigned-barber@test.com',
    );
    const appointment = await createAppointment(
      client.id,
      service.id,
      barberShop.id,
      assignedBarber.id,
    );

    await expect(
      sut.execute({ id: appointment.id, userId: assignedBarber.id }),
    ).resolves.toEqual(expect.objectContaining({ id: appointment.id }));
  });

  it('should hide the appointment from an unassigned barber', async () => {
    const { barberShop } = await createBarberShopWithOwner();
    const service = await createService(barberShop.id);
    const client = await createClient();
    const assignedBarber = await createBarber(
      barberShop.id,
      'assigned-denied-test@test.com',
    );
    const otherBarber = await createBarber(
      barberShop.id,
      'unassigned-barber@test.com',
    );
    const appointment = await createAppointment(
      client.id,
      service.id,
      barberShop.id,
      assignedBarber.id,
    );

    await expect(
      sut.execute({ id: appointment.id, userId: otherBarber.id }),
    ).rejects.toThrow(new NotFoundError('Appointment not found'));
  });

  it('should return all appointment fields correctly', async () => {
    // Arrange
    const { owner, barberShop } = await createBarberShopWithOwner();
    const service = await createService(barberShop._id);
    const client = await createClient();
    const appointmentDate = new Date('2025-12-20T14:30:00Z');

    const appointmentData = AppointmentDataBuilder({
      clientId: client.id,
      serviceId: service._id,
      barberShopId: barberShop._id,
      barberId: owner.id,
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
    const { owner, barberShop } = await createBarberShopWithOwner();
    const service = await createService(barberShop._id);
    const client = await createClient();
    const appointmentDate = new Date('2025-12-25T09:00:00Z');

    const appointmentData = AppointmentDataBuilder({
      clientId: client.id,
      serviceId: service._id,
      barberShopId: barberShop._id,
      barberId: owner.id,
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
