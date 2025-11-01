/* eslint-disable @typescript-eslint/no-unused-vars */
import { PrismaClient } from '@prisma/client';
import { AppointmentsPrismaRepository } from '../../appointments-prisma.repository';
import { Test, TestingModule } from '@nestjs/testing';
import { DatabaseModule } from '@/shared/infrastructure/database/database.module';
import { NotFoundError } from '@/shared/domain/errors/not-found-error';
import { setupPrismaTests } from '@/shared/infrastructure/database/testing/setup-prisma-tests';
import { AppointmentEntity } from '@/appointments/domain/entities/appointment.entity';
import { AppointmentsRepository } from '@/appointments/domain/repositories/appointments.repository';
import { AppointmentDataBuilder } from '@/appointments/domain/helpers/appointment-data-builder';
import { UserDataBuilder } from '@/users/domain/helpers/user-data-builder';
import { BarberShopDataBuilder } from '@/barberShop/domain/helpers/barberShop-data-builder';
import { ServiceDataBuilder } from '@/services/domain/helpers/service-data-builder';
import { UserEntity } from '@/users/domain/entities/user.entity';
import { BarberShopEntity } from '@/barberShop/domain/entities/barber-shop.entity';
import { ServiceEntity } from '@/services/domain/entities/services.entity';
import { Role } from '@/users/domain/entities/role.enum';

describe('AppointmentsPrismaRepository integration tests', () => {
  const prismaService = new PrismaClient();
  let sut: AppointmentsPrismaRepository;
  let module: TestingModule;

  beforeAll(async () => {
    setupPrismaTests();
    module = await Test.createTestingModule({
      imports: [DatabaseModule.forTest(prismaService)],
    }).compile();
  });

  beforeEach(async () => {
    sut = new AppointmentsPrismaRepository(prismaService as any);
    await prismaService.appointment.deleteMany();
    await prismaService.service.deleteMany();
    await prismaService.barberShop.deleteMany();
    await prismaService.user.deleteMany();
  });

  // Helper to create a barber shop with owner and a service
  const createBarberShopWithService = async () => {
    const owner = new UserEntity(UserDataBuilder({ role: Role.barber }));
    await prismaService.user.create({ data: owner.toJSON() });

    const barberShop = new BarberShopEntity(
      BarberShopDataBuilder({ ownerId: owner.id }),
    );

    await prismaService.barberShop.create({
      data: {
        id: barberShop._id,
        name: barberShop.name,
        address: barberShop.address.toString(),
        ownerId: owner.id,
      },
    });

    const service = new ServiceEntity(
      ServiceDataBuilder({ barberShopId: barberShop._id }),
    );

    await prismaService.service.create({
      data: {
        id: service._id,
        name: service.name,
        description: service.description,
        price: service.price,
        duration: service.duration,
        createdAt: service.createdAt,
        barberShopId: barberShop._id,
      },
    });

    return {
      barberShopId: barberShop._id,
      ownerId: owner.id,
      serviceId: service._id,
    };
  };

  const createClient = async (overrides = {}) => {
    const clientEntity = new UserEntity(
      UserDataBuilder({
        role: Role.client,
        ...overrides,
      }),
    );

    return prismaService.user.create({ data: clientEntity.toJSON() });
  };

  it('should throw error when entity not found', async () => {
    await expect(() => sut.findById('fake-id')).rejects.toThrow(
      new NotFoundError('AppointmentModel not found using id fake-id'),
    );
  });

  it('should find an entity by id', async () => {
    const { barberShopId, serviceId } = await createBarberShopWithService();
    const client = await createClient();

    const entity = new AppointmentEntity(
      AppointmentDataBuilder({
        barberShopId,
        serviceId,
        clientId: client.id,
        date: new Date('2025-10-31T10:00:00Z'),
      }),
    );

    const data = entity.toJSON();
    const newAppointment = await prismaService.appointment.create({ data });

    const output = await sut.findById(newAppointment.id);
    expect(output.toJSON()).toEqual(expect.objectContaining(entity.toJSON()));
  });

  it('should insert a new entity', async () => {
    const { barberShopId, serviceId } = await createBarberShopWithService();
    const client = await createClient();

    const entity = new AppointmentEntity(
      AppointmentDataBuilder({
        barberShopId,
        serviceId,
        clientId: client.id,
      }),
    );

    await sut.insert(entity);

    const result = await prismaService.appointment.findUnique({
      where: { id: entity._id },
    });

    expect(result).not.toBeNull();
    expect(result?.clientId).toBe(entity.clientId);
    expect(result?.serviceId).toBe(entity.serviceId);
    expect(result?.barberShopId).toBe(entity.barberShopId);
  });

  it('should return all appointments', async () => {
    const { barberShopId, serviceId } = await createBarberShopWithService();
    const client = await createClient();

    const entity = new AppointmentEntity(
      AppointmentDataBuilder({
        barberShopId,
        serviceId,
        clientId: client.id,
      }),
    );

    await prismaService.appointment.create({ data: entity.toJSON() });

    const entities = await sut.findAll();
    expect(entities).toHaveLength(1);
    expect(entities[0]).toMatchObject({
      id: entity.id,
      date: entity.date,
      status: entity.status,
      clientId: entity.clientId,
      serviceId: entity.serviceId,
      barberShopId: entity.barberShopId,
      createdAt: entity.createdAt,
    });
  });

  it('should throw error on update when entity not found', async () => {
    const entity = new AppointmentEntity(AppointmentDataBuilder({}));
    await expect(() => sut.update(entity)).rejects.toThrow(
      new NotFoundError(`AppointmentModel not found using id ${entity._id}`),
    );
  });

  it('should update an entity', async () => {
    const { barberShopId, serviceId } = await createBarberShopWithService();
    const client = await createClient();

    const entity = new AppointmentEntity(
      AppointmentDataBuilder({
        barberShopId,
        serviceId,
        clientId: client.id,
        date: new Date('2025-11-01T09:00:00Z'),
      }),
    );

    await prismaService.appointment.create({ data: entity.toJSON() });

    const newDate = new Date('2025-11-02T11:00:00Z');
    entity.update(newDate, entity.serviceId);
    await sut.update(entity);

    const updated = await prismaService.appointment.findUnique({
      where: { id: entity._id },
    });
    expect(updated?.date.toISOString()).toBe(newDate.toISOString());
  });

  it('should throw error on delete when entity not found', async () => {
    const entity = new AppointmentEntity(AppointmentDataBuilder({}));
    await expect(() => sut.delete(entity._id)).rejects.toThrow(
      new NotFoundError(`AppointmentModel not found using id ${entity._id}`),
    );
  });

  it('should delete an entity', async () => {
    const { barberShopId, serviceId } = await createBarberShopWithService();
    const client = await createClient();

    const entity = new AppointmentEntity(
      AppointmentDataBuilder({
        barberShopId,
        serviceId,
        clientId: client.id,
      }),
    );

    await prismaService.appointment.create({ data: entity.toJSON() });
    await sut.delete(entity._id);

    const deleted = await prismaService.appointment.findUnique({
      where: { id: entity._id },
    });
    expect(deleted).toBeNull();
  });

  describe('search method tests', () => {
    it('should apply only pagination when other params are null', async () => {
      const createdAt = new Date();
      const appointments: AppointmentEntity[] = [];
      const { barberShopId, serviceId } = await createBarberShopWithService();

      for (let i = 0; i < 16; i++) {
        const client = await createClient({});
        appointments.push(
          new AppointmentEntity(
            AppointmentDataBuilder({
              barberShopId,
              serviceId,
              clientId: client.id,
              createdAt: new Date(createdAt.getTime() + i),
            }),
          ),
        );
      }

      await prismaService.appointment.createMany({
        data: appointments.map((a) => a.toJSON()),
      });

      const searchOutput = await sut.search(
        new AppointmentsRepository.AppointmentsSearchParams(),
      );

      expect(searchOutput.total).toBe(16);
      expect(searchOutput.items.length).toBe(15); // default perPage in repo is 15
      searchOutput.items.forEach((item) =>
        expect(item).toBeInstanceOf(AppointmentEntity),
      );
    });

    it('should search using filter, sort and paginate', async () => {
      const baseDate = new Date('2025-12-01T08:00:00Z');
      const { barberShopId, serviceId } = await createBarberShopWithService();
      const clients = [
        await createClient(),
        await createClient(),
        await createClient(),
      ];

      const arrange = [
        AppointmentDataBuilder({
          barberShopId,
          serviceId,
          clientId: clients[0].id,
          date: new Date(baseDate.getTime() + 1),
        }),
        AppointmentDataBuilder({
          barberShopId,
          serviceId,
          clientId: clients[1].id,
          date: new Date(baseDate.getTime() + 2),
        }),
        AppointmentDataBuilder({
          barberShopId,
          serviceId,
          clientId: clients[2].id,
          date: new Date(baseDate.getTime() + 3),
        }),
      ];

      // Wrap into entities to ensure id is present (Prisma createMany requires id)
      const arrangeEntities = arrange.map((a) => new AppointmentEntity(a));
      await prismaService.appointment.createMany({
        data: arrangeEntities.map((e) => e.toJSON()),
      });

      const filter = { serviceId } as any;

      const searchOutput = await sut.search(
        new AppointmentsRepository.AppointmentsSearchParams({
          page: 1,
          perPage: 2,
          sort: 'date',
          sortDir: 'asc',
          filter,
        }),
      );

      expect(searchOutput.items.length).toBe(2);
      expect(searchOutput.items[0]).toBeInstanceOf(AppointmentEntity);
      expect(searchOutput.total).toBe(3);
    });
  });
});
