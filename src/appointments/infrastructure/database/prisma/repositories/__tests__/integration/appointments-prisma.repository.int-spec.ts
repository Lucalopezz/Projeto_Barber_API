import { faker } from '@faker-js/faker';
import { BarberAvailabilityPrismaRepository } from '../../barber-availability-prisma.repository';
import { BarberScheduleEntity } from '@/appointments/domain/entities/barber-schedule.entity';
/* eslint-disable @typescript-eslint/no-unused-vars */
import { PrismaClient, Prisma } from '@prisma/client';
import { AppointmentsPrismaRepository } from '../../appointments-prisma.repository';
import { Test, TestingModule } from '@nestjs/testing';
import { DatabaseModule } from '@/shared/infrastructure/database/database.module';
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
import { ConflictError } from '@/shared/domain/errors/conflict-error';

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

  afterEach(() => jest.restoreAllMocks());
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

  it('should return null when entity is not found', async () => {
    await expect(sut.findById('fake-id')).resolves.toBeNull();
  });

  it('should find an entity by id', async () => {
    const { barberShopId, ownerId, serviceId } =
      await createBarberShopWithService();
    const client = await createClient();

    const entity = new AppointmentEntity(
      AppointmentDataBuilder({
        barberShopId,
        barberId: ownerId,
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
    const { barberShopId, ownerId, serviceId } =
      await createBarberShopWithService();
    const client = await createClient();

    const entity = new AppointmentEntity(
      AppointmentDataBuilder({
        barberShopId,
        barberId: ownerId,
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

  it('should reject overlapping scheduled intervals for the same barber at database level', async () => {
    const { barberShopId, ownerId, serviceId } =
      await createBarberShopWithService();
    const firstClient = await createClient();
    const secondClient = await createClient();
    const date = new Date('2026-08-03T13:00:00.000Z');
    const first = new AppointmentEntity(
      AppointmentDataBuilder({
        barberShopId,
        barberId: ownerId,
        serviceId,
        clientId: firstClient.id,
        date,
      }),
    );
    const second = new AppointmentEntity(
      AppointmentDataBuilder({
        barberShopId,
        barberId: ownerId,
        serviceId,
        clientId: secondClient.id,
        date: new Date('2026-08-03T13:15:00.000Z'),
      }),
    );

    await sut.insert(first);

    await expect(sut.insert(second)).rejects.toThrow(
      new ConflictError('Appointment not available'),
    );
  });

  it('should return all appointments', async () => {
    const { barberShopId, ownerId, serviceId } =
      await createBarberShopWithService();
    const client = await createClient();

    const entity = new AppointmentEntity(
      AppointmentDataBuilder({
        barberShopId,
        barberId: ownerId,
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

  it('should reject update when entity is not found', async () => {
    const entity = new AppointmentEntity(AppointmentDataBuilder({}));
    await expect(sut.update(entity)).rejects.toThrow();
  });

  it('should update an entity', async () => {
    const { barberShopId, ownerId, serviceId } =
      await createBarberShopWithService();
    const client = await createClient();

    const entity = new AppointmentEntity(
      AppointmentDataBuilder({
        barberShopId,
        barberId: ownerId,
        serviceId,
        clientId: client.id,
        date: new Date('2025-11-01T09:00:00Z'),
      }),
    );

    await prismaService.appointment.create({ data: entity.toJSON() });

    const newDate = new Date('2025-11-02T11:00:00Z');
    entity.update(
      newDate,
      entity.serviceId,
      new Date(newDate.getTime() + 30 * 60 * 1000),
    );
    await sut.update(entity);

    const updated = await prismaService.appointment.findUnique({
      where: { id: entity._id },
    });
    expect(updated?.date.toISOString()).toBe(newDate.toISOString());
  });

  it('should reject delete when entity is not found', async () => {
    const entity = new AppointmentEntity(AppointmentDataBuilder({}));
    await expect(sut.delete(entity._id)).rejects.toThrow();
  });

  it('should delete an entity', async () => {
    const { barberShopId, ownerId, serviceId } =
      await createBarberShopWithService();
    const client = await createClient();

    const entity = new AppointmentEntity(
      AppointmentDataBuilder({
        barberShopId,
        barberId: ownerId,
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
      // Pagination fixtures must stay disjoint even if Faker repeats a timestamp.
      jest
        .spyOn(faker.date, 'future')
        .mockReturnValue(new Date('2030-01-07T09:00:00.000Z'));
      const createdAt = new Date();
      const appointments: AppointmentEntity[] = [];
      const { barberShopId, ownerId, serviceId } =
        await createBarberShopWithService();

      for (let i = 0; i < 16; i++) {
        const client = await createClient({});
        appointments.push(
          new AppointmentEntity(
            AppointmentDataBuilder({
              barberShopId,
              barberId: ownerId,
              serviceId,
              clientId: client.id,
              createdAt: new Date(createdAt.getTime() + i),
              date: new Date(Date.UTC(2030, 0, 7, 9 + i)),
              endDate: new Date(Date.UTC(2030, 0, 7, 9 + i, 30)),
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
      const { barberShopId, ownerId, serviceId } =
        await createBarberShopWithService();
      const clients = [
        await createClient(),
        await createClient(),
        await createClient(),
      ];

      const arrange = [
        AppointmentDataBuilder({
          barberShopId,
          barberId: ownerId,
          serviceId,
          clientId: clients[0].id,
          date: new Date(baseDate.getTime() + 31 * 60 * 1000),
        }),
        AppointmentDataBuilder({
          barberShopId,
          barberId: ownerId,
          serviceId,
          clientId: clients[1].id,
          date: new Date(baseDate.getTime() + 62 * 60 * 1000),
        }),
        AppointmentDataBuilder({
          barberShopId,
          barberId: ownerId,
          serviceId,
          clientId: clients[2].id,
          date: new Date(baseDate.getTime() + 93 * 60 * 1000),
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
  it('serializes complete schedule replacements even when the initial schedule is empty', async () => {
    const { ownerId } = await createBarberShopWithService();
    const url = new URL(process.env.DATABASE_URL!);
    url.searchParams.set(
      'application_name',
      'barber_schedule_concurrency_second',
    );
    const second = new PrismaClient({ datasourceUrl: url.toString() });
    let releaseFirst!: () => void;
    let firstDeleted!: () => void;
    const resume = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });
    const deleted = new Promise<void>((resolve) => {
      firstDeleted = resolve;
    });
    const schedule = (startMinute: number, endMinute: number) =>
      new BarberScheduleEntity({
        barberId: ownerId,
        dayOfWeek: 1,
        startMinute,
        endMinute,
      });
    const firstPayload = [schedule(540, 660), schedule(780, 840)];
    const secondPayload = [schedule(600, 720)];
    let secondFinished = false;
    const firstWrite = prismaService.$transaction(
      async (tx) => {
        // Pause after the actual DELETE, retaining this transaction's database locks.
        const wrapped = new Proxy(tx, {
          get(target, prop) {
            if (prop !== 'barberSchedule') return Reflect.get(target, prop);
            return new Proxy(target.barberSchedule, {
              get(delegate, method) {
                if (method !== 'deleteMany')
                  return Reflect.get(delegate, method);
                return async (args: Prisma.BarberScheduleDeleteManyArgs) => {
                  const result = await delegate.deleteMany(args);
                  firstDeleted();
                  await resume;
                  return result;
                };
              },
            });
          },
        });
        await new BarberAvailabilityPrismaRepository(wrapped).replaceSchedules(
          ownerId,
          firstPayload,
        );
      },
      { timeout: 15000 },
    );
    await deleted;
    const secondWrite = second
      .$transaction(
        async (tx) => {
          await new BarberAvailabilityPrismaRepository(tx).replaceSchedules(
            ownerId,
            secondPayload,
          );
        },
        { timeout: 15000 },
      )
      .finally(() => {
        secondFinished = true;
      });
    try {
      // Wait for an explicit database lock barrier or for the unprotected transaction
      // to finish. No sleeps or timing assumptions decide which write wins.
      const deadline = Date.now() + 10000;
      while (!secondFinished) {
        const blocked = await prismaService.$queryRaw<{ blocked: boolean }[]>`
          SELECT EXISTS(SELECT 1 FROM pg_stat_activity
            WHERE application_name = 'barber_schedule_concurrency_second'
              AND wait_event_type = 'Lock') AS blocked`;
        if (blocked[0].blocked) break;
        if (Date.now() > deadline)
          throw new Error(
            'Second replacement did not reach the database barrier',
          );
      }
    } finally {
      releaseFirst();
    }
    try {
      await Promise.all([firstWrite, secondWrite]);
      const rows = await prismaService.barberSchedule.findMany({
        where: { barberId: ownerId },
      });
      expect(
        rows.map(({ startMinute, endMinute }) => ({ startMinute, endMinute })),
      ).toEqual([{ startMinute: 600, endMinute: 720 }]);
    } finally {
      await second.$disconnect();
    }
  });
});
