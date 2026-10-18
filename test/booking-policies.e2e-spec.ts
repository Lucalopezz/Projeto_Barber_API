import { AppointmentsPrismaRepository } from '@/appointments/infrastructure/database/prisma/repositories/appointments-prisma.repository';
import { systemClock } from '@/shared/application/providers/clock';
import { AppModule } from '@/app.module';
import { applyGlobalConfig } from '@/global-config';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import {
  clearDatabase,
  setupPrismaTests,
} from '@/shared/infrastructure/database/testing/setup-prisma-tests';
import { EnvConfigService } from '@/shared/infrastructure/env-config/env-config.service';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';

describe('Selected booking policies (Fastify/PostgreSQL)', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let serviceId: string;
  let shopId: string;
  let now = new Date('2030-01-01T12:00:00Z');
  let clientAuthorization: string;
  let ownerAuthorization: string;

  const api = '/api/v1';
  const password = 'senha-segura';
  // Monday, 09:00 in America/Sao_Paulo; the service lasts 45 minutes.
  const date = '2030-01-07T12:00:00.000Z';

  const login = async (email: string) => {
    const response = await app.inject({
      method: 'POST',
      url: `${api}/users/login`,
      payload: { email, password },
    });
    expect(response.statusCode).toBe(201);
    return `Bearer ${response.json<{ accessToken: string }>().accessToken}`;
  };

  const book = (appointmentDate = date) =>
    app.inject({
      method: 'POST',
      url: `${api}/appointments`,
      headers: { authorization: clientAuthorization },
      payload: { serviceId, date: appointmentDate },
    });

  beforeAll(async () => {
    setupPrismaTests();
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
      { logger: false },
    );
    applyGlobalConfig(app, app.get(EnvConfigService));
    await app.init();
    await app.getHttpAdapter().getInstance().ready();

    prisma = app.get(PrismaService);
    await clearDatabase(prisma);

    for (const role of ['barber', 'client']) {
      const response = await app.inject({
        method: 'POST',
        url: `${api}/users`,
        payload: {
          name: `Availability ${role}`,
          email: `${role}.availability@example.com`,
          password,
          role,
        },
      });
      expect(response.statusCode).toBe(201);
    }
    clientAuthorization = await login('client.availability@example.com');
    const barberAuthorization = await login('barber.availability@example.com');
    const shopResponse = await app.inject({
      method: 'POST',
      url: `${api}/barber-shops`,
      headers: { authorization: barberAuthorization },
      payload: {
        name: 'Availability Barber Shop',
        address: 'Rua das Flores, 123, Sao Paulo - SP',
        timezone: 'America/Sao_Paulo',
      },
    });
    expect(shopResponse.statusCode).toBe(201);
    shopId = shopResponse.json().data.id;

    ownerAuthorization = await login('barber.availability@example.com');
    const scheduleResponse = await app.inject({
      method: 'PUT',
      url: `${api}/appointments/availability/me/schedule`,
      headers: { authorization: ownerAuthorization },
      payload: {
        schedules: [{ dayOfWeek: 1, startMinute: 540, endMinute: 1020 }],
      },
    });
    expect(scheduleResponse.statusCode).toBe(200);

    const serviceResponse = await app.inject({
      method: 'POST',
      url: `${api}/services`,
      headers: { authorization: ownerAuthorization },
      payload: {
        name: 'Corte',
        description: 'Corte e acabamento',
        price: 60,
        duration: 45,
      },
    });
    expect(serviceResponse.statusCode).toBe(201);
    serviceId = serviceResponse.json<{ data: { id: string } }>().data.id;
  });

  beforeEach(async () => {
    now = new Date('2030-01-01T12:00:00Z');
    jest.spyOn(systemClock, 'now').mockImplementation(() => new Date(now));
    await prisma.appointment.deleteMany();
    await prisma.barberShop.update({
      where: { id: shopId },
      data: { timezone: 'America/Sao_Paulo' },
    });
    const shop = await prisma.barberShop.findUniqueOrThrow({
      where: { id: shopId },
    });
    await prisma.barberSchedule.deleteMany({
      where: { barberId: shop.ownerId },
    });
    await prisma.barberSchedule.create({
      data: {
        barberId: shop.ownerId,
        dayOfWeek: 1,
        startMinute: 540,
        endMinute: 1020,
      },
    });
    await prisma.barberTimeOff.deleteMany();
  });

  afterEach(() => jest.restoreAllMocks());

  afterAll(async () => {
    if (prisma) await clearDatabase(prisma);
    if (app) await app.close();
  });

  it('accepts exactly30min notice and rejects one millisecond less on creation', async () => {
    now = new Date('2030-01-07T11:30:00.001Z');
    expect((await book()).statusCode).toBe(400);
    now = new Date('2030-01-07T11:30:00.000Z');
    expect((await book()).statusCode).toBe(201);
  });
  it('accepts exactly60days horizon but rejects one millisecond beyond', async () => {
    now = new Date(new Date(date).getTime() - 60 * 24 * 3600000 - 1);
    expect((await book()).statusCode).toBe(400);
    now = new Date(now.getTime() + 1);
    expect((await book()).statusCode).toBe(201);
  });
  it.each([
    '2029-12-31T12:00:00.000Z',
    '2030-01-07T12:15:00.000Z',
    '2030-01-07T12:30:01.000Z',
    '2030-01-07T12:30:00.001Z',
  ])('rejects past or off-grid starts: %s', async (value) => {
    expect((await book(value)).statusCode).toBe(400);
  });
  it('applies the same notice policy to rescheduling and preserves the previous reservation', async () => {
    const response = await book();
    expect(response.statusCode).toBe(201);
    const id = response.json().data.id;
    now = new Date('2030-01-07T13:00:00.001Z');
    const update = await app.inject({
      method: 'PUT',
      url: `${api}/appointments/${id}`,
      headers: { authorization: ownerAuthorization },
      payload: { date: '2030-01-07T13:30:00Z' },
    });
    expect(update.statusCode).toBe(400);
    expect(
      (
        await prisma.appointment.findUniqueOrThrow({ where: { id } })
      ).date.toISOString(),
    ).toBe(date);
  });
  it('allows client cancellation at24h, rejects24h minus1ms, and leaves professional management available', async () => {
    let response = await book();
    expect(response.statusCode).toBe(201);
    let id = response.json().data.id;
    const cancel = (authorization: string) =>
      app.inject({
        method: 'PATCH',
        url: `${api}/appointments/${id}`,
        headers: { authorization },
        payload: { newStatus: 'cancelled' },
      });
    now = new Date('2030-01-06T12:00:00.001Z');
    expect((await cancel(clientAuthorization)).statusCode).toBe(403);
    expect(
      (await prisma.appointment.findUniqueOrThrow({ where: { id } })).status,
    ).toBe('scheduled');
    now = new Date('2030-01-06T12:00:00.000Z');
    expect((await cancel(clientAuthorization)).statusCode).toBe(200);
    now = new Date('2030-01-01T12:00:00Z');
    response = await book();
    expect(response.statusCode).toBe(201);
    id = response.json().data.id;
    now = new Date('2030-01-07T11:59:00Z');
    expect((await cancel(ownerAuthorization)).statusCode).toBe(200);
  });
  it('preserves existing reservations when adding timeoff and blocks new bookings or rescheduling into it', async () => {
    const booked = await book();
    expect(booked.statusCode).toBe(201);
    const id = booked.json().data.id;
    const off = await app.inject({
      method: 'POST',
      url: `${api}/appointments/availability/me/time-offs`,
      headers: { authorization: ownerAuthorization },
      payload: { startsAt: date, endsAt: '2030-01-07T14:00:00Z' },
    });
    expect(off.statusCode).toBe(201);
    expect(
      (await prisma.appointment.findUniqueOrThrow({ where: { id } })).status,
    ).toBe('scheduled');
    expect((await book('2030-01-07T13:00:00Z')).statusCode).toBe(409);
    const update = await app.inject({
      method: 'PUT',
      url: `${api}/appointments/${id}`,
      headers: { authorization: ownerAuthorization },
      payload: { date: '2030-01-07T13:00:00Z' },
    });
    expect(update.statusCode).toBe(409);
    expect(
      (
        await prisma.appointment.findUniqueOrThrow({ where: { id } })
      ).date.toISOString(),
    ).toBe(date);
  });
  it('preserves existing reservations after schedule replacement while blocking new bookings outside it', async () => {
    const booked = await book();
    expect(booked.statusCode).toBe(201);
    const id = booked.json().data.id;
    const update = await app.inject({
      method: 'PUT',
      url: `${api}/appointments/availability/me/schedule`,
      headers: { authorization: ownerAuthorization },
      payload: {
        schedules: [{ dayOfWeek: 1, startMinute: 600, endMinute: 660 }],
      },
    });
    expect(update.statusCode).toBe(200);
    expect(
      (await prisma.appointment.findUniqueOrThrow({ where: { id } })).status,
    ).toBe('scheduled');
    expect((await book('2030-01-07T12:00:00Z')).statusCode).toBe(409);
  });

  it.each([
    ['create', 'timeoff'],
    ['create', 'schedule'],
    ['reschedule', 'timeoff'],
    ['reschedule', 'schedule'],
  ])(
    'serializes %s availability validation/persistence against concurrent %s',
    async (operation, change) => {
      let target = date;
      let appointmentId: string | undefined;
      if (operation === 'reschedule') {
        const initial = await book();
        expect(initial.statusCode).toBe(201);
        appointmentId = initial.json().data.id;
        target = '2030-01-07T14:00:00.000Z';
      }
      let reached!: () => void;
      let release!: () => void;
      const paused = new Promise<void>((resolve) => {
        reached = resolve;
      });
      const resume = new Promise<void>((resolve) => {
        release = resolve;
      });
      const method = operation === 'create' ? 'insert' : 'update';
      const original = AppointmentsPrismaRepository.prototype[method];
      jest
        .spyOn(AppointmentsPrismaRepository.prototype, method)
        .mockImplementation(async function (
          this: AppointmentsPrismaRepository,
          entity,
        ) {
          reached();
          await resume;
          return original.call(this, entity);
        });
      const booking = Promise.resolve(
        operation === 'create'
          ? book(target)
          : app.inject({
              method: 'PUT',
              url: `${api}/appointments/${appointmentId}`,
              headers: { authorization: ownerAuthorization },
              payload: { date: target },
            }),
      );
      await Promise.race([
        paused,
        booking.then(() => {
          throw new Error(
            'Reservation finished before reaching persistence barrier',
          );
        }),
      ]);
      let changeFinished = false;
      const changed = Promise.resolve(
        app.inject(
          change === 'timeoff'
            ? {
                method: 'POST',
                url: `${api}/appointments/availability/me/time-offs`,
                headers: { authorization: ownerAuthorization },
                payload: {
                  startsAt: target,
                  endsAt: new Date(
                    new Date(target).getTime() + 7200000,
                  ).toISOString(),
                },
              }
            : {
                method: 'PUT',
                url: `${api}/appointments/availability/me/schedule`,
                headers: { authorization: ownerAuthorization },
                payload: {
                  schedules: [
                    { dayOfWeek: 1, startMinute: 600, endMinute: 660 },
                  ],
                },
              },
        ),
      ).then((response) => {
        changeFinished = true;
        return response;
      });
      let finishedBeforeRelease = false;
      try {
        const deadline = Date.now() + 10000;
        while (!changeFinished) {
          const waiting = await prisma.$queryRaw<
            { blocked: boolean }[]
          >`SELECT EXISTS(SELECT 1 FROM pg_stat_activity WHERE wait_event_type='Lock' AND query LIKE '%FOR UPDATE%') AS blocked`;
          if (waiting[0].blocked) break;
          if (Date.now() > deadline)
            throw new Error(
              'Concurrent availability mutation did not reach database barrier',
            );
        }
        finishedBeforeRelease = changeFinished;
      } finally {
        release();
      }
      const [booked, availabilityChange] = await Promise.all([
        booking,
        changed,
      ]);
      expect(booked.statusCode).toBe(operation === 'create' ? 201 : 200);
      expect(availabilityChange.statusCode).toBe(
        change === 'timeoff' ? 201 : 200,
      );
      expect(finishedBeforeRelease).toBe(false);
      const persisted = await prisma.appointment.findUniqueOrThrow({
        where: { id: booked.json().data.id },
      });
      expect(persisted.status).toBe('scheduled');
      expect(persisted.date.toISOString()).toBe(target);
    },
  );
  it('public slots respect local grid, minimum notice and horizon, including quarter-hour timezones', async () => {
    await prisma.barberShop.update({
      where: { id: shopId },
      data: { timezone: 'Asia/Kathmandu' },
    });
    const owner = await prisma.barberShop.findUniqueOrThrow({
      where: { id: shopId },
    });
    await prisma.barberSchedule.deleteMany({
      where: { barberId: owner.ownerId },
    });
    await prisma.barberSchedule.create({
      data: {
        barberId: owner.ownerId,
        dayOfWeek: 1,
        startMinute: 550,
        endMinute: 720,
      },
    });
    now = new Date('2030-01-07T03:30:00Z');
    const response = await app.inject({
      method: 'GET',
      url: `${api}/barber-shops/${shopId}/availability?date=2030-01-07&serviceId=${serviceId}`,
    });
    expect(response.statusCode).toBe(200);
    const slots = response.json().data.slots;
    expect(slots.map((slot: { startsAt: string }) => slot.startsAt)).toEqual([
      '2030-01-07T04:15:00.000Z',
      '2030-01-07T04:45:00.000Z',
      '2030-01-07T05:15:00.000Z',
    ]);
    for (const slot of slots) {
      const booked = await book(slot.startsAt);
      expect(booked.statusCode).toBe(201);
      await prisma.appointment.delete({ where: { id: booked.json().data.id } });
    }
    now = new Date('2031-01-01T00:00:00Z');
    const past = await app.inject({
      method: 'GET',
      url: `${api}/barber-shops/${shopId}/availability?date=2030-01-07&serviceId=${serviceId}`,
    });
    expect(past.json().data.slots).toEqual([]);
  });
});
