import { ProfessionalBookingTransaction } from '@/appointments/application/ports/professional-booking-transaction';
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

describe('Concurrent appointment writes (Fastify/PostgreSQL)', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let serviceId: string;
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
    jest
      .spyOn(systemClock, 'now')
      .mockReturnValue(new Date('2030-01-01T12:00:00Z'));
    await prisma.appointment.deleteMany();
    await prisma.barberTimeOff.deleteMany();
  });

  afterEach(() => jest.restoreAllMocks());

  afterAll(async () => {
    await app?.close();
  });

  function gate() {
    let release!: () => void;
    const promise = new Promise<void>((resolve) => {
      release = resolve;
    });
    return { promise, release };
  }

  it.each(['cancelled', 'completed'])(
    'rejects stale rescheduling after %s without reopening the appointment',
    async (terminal) => {
      const booked = await book();
      expect(booked.statusCode).toBe(201);
      const id = booked.json().data.id;
      const repository = app.get<ProfessionalBookingTransaction>(
        'ProfessionalBookingTransaction',
      );
      const reached = gate();
      const resume = gate();
      const original = repository.run.bind(repository);
      let intercepted = false;
      const spy = jest
        .spyOn(repository, 'run')
        .mockImplementation(async (barberId, work) => {
          if (!intercepted) {
            intercepted = true;
            reached.release();
            await resume.promise;
          }
          return original(barberId, work);
        });
      const pending = Promise.resolve(
        app.inject({
          method: 'PUT',
          url: `${api}/appointments/${id}`,
          headers: { authorization: ownerAuthorization },
          payload: { date: '2030-01-07T14:00:00.000Z' },
        }),
      );
      try {
        await reached.promise;
        const result = await app.inject({
          method: 'PATCH',
          url: `${api}/appointments/${id}`,
          headers: { authorization: ownerAuthorization },
          payload: { newStatus: terminal },
        });
        expect(result.statusCode).toBe(200);
      } finally {
        resume.release();
      }
      const loser = await pending;
      spy.mockRestore();
      expect(loser.statusCode).toBe(409);
      expect(
        (await prisma.appointment.findUniqueOrThrow({ where: { id } })).status,
      ).toBe(terminal);
      const events = await prisma.notificationOutbox.findMany({
        where: { appointmentId: id },
      });
      expect(
        events.filter((event) =>
          event.eventKey.startsWith('appointment-updated-'),
        ),
      ).toHaveLength(0);
      expect(
        events.filter((event) =>
          event.eventKey.startsWith('appointment-cancelled-'),
        ),
      ).toHaveLength(terminal === 'cancelled' ? 1 : 0);
    },
  );

  it('rejects a second stale rescheduling even while both copies are scheduled', async () => {
    const booked = await book('2030-01-07T15:00:00.000Z');
    expect(booked.statusCode).toBe(201);
    const id = booked.json().data.id;
    const repository = app.get<ProfessionalBookingTransaction>(
      'ProfessionalBookingTransaction',
    );
    const reached = gate();
    const resume = gate();
    const original = repository.run.bind(repository);
    let intercepted = false;
    const spy = jest
      .spyOn(repository, 'run')
      .mockImplementation(async (barberId, work) => {
        if (!intercepted) {
          intercepted = true;
          reached.release();
          await resume.promise;
        }
        return original(barberId, work);
      });
    const update = (date: string) =>
      app.inject({
        method: 'PUT',
        url: `${api}/appointments/${id}`,
        headers: { authorization: ownerAuthorization },
        payload: { date },
      });
    const pending = Promise.resolve(update('2030-01-07T16:00:00.000Z'));
    try {
      await reached.promise;
      expect((await update('2030-01-07T17:00:00.000Z')).statusCode).toBe(200);
    } finally {
      resume.release();
    }
    const loser = await pending;
    spy.mockRestore();
    expect(loser.statusCode).toBe(409);
    expect(
      (
        await prisma.appointment.findUniqueOrThrow({ where: { id } })
      ).date.toISOString(),
    ).toBe('2030-01-07T17:00:00.000Z');
    const events = await prisma.notificationOutbox.findMany({
      where: {
        appointmentId: id,
        eventKey: { startsWith: 'appointment-updated-' },
      },
    });
    expect(events).toHaveLength(1);
    expect(events[0].eventKey).toBe(`appointment-updated-${id}-v1`);
    expect(events[0].startsAt.toISOString()).toBe('2030-01-07T17:00:00.000Z');
  });
  it('rejects stale cancellation after concurrent completion', async () => {
    const booked = await book();
    expect(booked.statusCode).toBe(201);
    expect(booked.json().data).not.toHaveProperty('version');
    const id = booked.json().data.id;
    const repository = app.get<ProfessionalBookingTransaction>(
      'ProfessionalBookingTransaction',
    );
    const reached = gate();
    const resume = gate();
    const original = repository.run.bind(repository);
    let intercepted = false;
    const spy = jest
      .spyOn(repository, 'run')
      .mockImplementation(async (barberId, work) => {
        if (!intercepted) {
          intercepted = true;
          reached.release();
          await resume.promise;
        }
        return original(barberId, work);
      });
    const change = (newStatus: string) =>
      app.inject({
        method: 'PATCH',
        url: `${api}/appointments/${id}`,
        headers: { authorization: ownerAuthorization },
        payload: { newStatus },
      });
    const pending = Promise.resolve(change('cancelled'));
    try {
      await reached.promise;
      expect((await change('completed')).statusCode).toBe(200);
    } finally {
      resume.release();
    }
    const loser = await pending;
    spy.mockRestore();
    expect(loser.statusCode).toBe(409);
    expect(
      (await prisma.appointment.findUniqueOrThrow({ where: { id } })).status,
    ).toBe('completed');
    expect(
      await prisma.notificationOutbox.count({
        where: {
          appointmentId: id,
          eventKey: { startsWith: 'appointment-cancelled-' },
        },
      }),
    ).toBe(0);
  });

  it('only the winning cancellation produces an event when two stale copies compete', async () => {
    const booked = await book();
    expect(booked.statusCode).toBe(201);
    const id = booked.json().data.id;
    const repository = app.get<ProfessionalBookingTransaction>(
      'ProfessionalBookingTransaction',
    );
    const reached = gate();
    const resume = gate();
    const original = repository.run.bind(repository);
    let intercepted = false;
    const spy = jest
      .spyOn(repository, 'run')
      .mockImplementation(async (barberId, work) => {
        if (!intercepted) {
          intercepted = true;
          reached.release();
          await resume.promise;
        }
        return original(barberId, work);
      });
    const cancel = () =>
      app.inject({
        method: 'PATCH',
        url: `${api}/appointments/${id}`,
        headers: { authorization: ownerAuthorization },
        payload: { newStatus: 'cancelled' },
      });
    const pending = Promise.resolve(cancel());
    try {
      await reached.promise;
      expect((await cancel()).statusCode).toBe(200);
    } finally {
      resume.release();
    }
    const loser = await pending;
    spy.mockRestore();
    expect(loser.statusCode).toBe(409);
    const events = await prisma.notificationOutbox.findMany({
      where: {
        appointmentId: id,
        eventKey: { startsWith: 'appointment-cancelled-' },
      },
    });
    expect(events).toHaveLength(1);
    expect(events[0].eventKey).toBe(`appointment-cancelled-${id}-v1`);
    expect(
      (await prisma.appointment.findUniqueOrThrow({ where: { id } })).status,
    ).toBe('cancelled');
  });
});
