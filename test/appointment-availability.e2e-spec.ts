import { AppModule } from '@/app.module';
import { AppointmentAvailabilityService } from '@/appointments/application/services/appointment-availability.service';
import { AppointmentsPrismaRepository } from '@/appointments/infrastructure/database/prisma/repositories/appointments-prisma.repository';
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

describe('Appointment availability HTTP contract (Fastify e2e)', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let serviceId: string;
  let clientAuthorization: string;
  let ownerAuthorization: string;

  const api = '/api/v1';
  const password = 'senha-segura';
  // Monday, 09:00 in America/Sao_Paulo; the service lasts 45 minutes.
  const date = '2030-01-07T12:00:00.000Z';
  const conflict = {
    statusCode: 409,
    error: 'Conflict',
    message: 'Appointment not available',
  };

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
    await prisma.appointment.deleteMany();
    await prisma.barberTimeOff.deleteMany();
  });

  afterEach(() => jest.restoreAllMocks());

  afterAll(async () => {
    if (prisma) await clearDatabase(prisma);
    if (app) await app.close();
  });

  it('returns 409 for a duplicate booking without persisting another appointment', async () => {
    expect((await book()).statusCode).toBe(201);

    const response = await book();

    expect(response.statusCode).toBe(409);
    expect(response.json()).toEqual(conflict);
    expect(await prisma.appointment.count()).toBe(1);
  });

  it('returns 409 when the interval is outside the local working schedule', async () => {
    const response = await book('2030-01-07T11:00:00.000Z');

    expect(response.statusCode).toBe(409);
    expect(response.json()).toEqual(conflict);
    expect(await prisma.appointment.count()).toBe(0);
  });

  it('returns 409 when the professional has time off', async () => {
    const timeOffResponse = await app.inject({
      method: 'POST',
      url: `${api}/appointments/availability/me/time-offs`,
      headers: { authorization: ownerAuthorization },
      payload: { startsAt: date, endsAt: '2030-01-07T13:00:00.000Z' },
    });
    expect(timeOffResponse.statusCode).toBe(201);

    const response = await book();

    expect(response.statusCode).toBe(409);
    expect(response.json()).toEqual(conflict);
    expect(await prisma.appointment.count()).toBe(0);
  });

  it('returns 409 for rescheduling to an occupied interval and preserves the original date', async () => {
    expect((await book()).statusCode).toBe(201);
    const originalDate = '2030-01-07T13:00:00.000Z';
    const second = await book(originalDate);
    expect(second.statusCode).toBe(201);
    const appointmentId = second.json<{ data: { id: string } }>().data.id;

    const response = await app.inject({
      method: 'PUT',
      url: `${api}/appointments/${appointmentId}`,
      headers: { authorization: ownerAuthorization },
      payload: { date },
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toEqual(conflict);
    const persisted = await prisma.appointment.findUniqueOrThrow({
      where: { id: appointmentId },
    });
    expect(persisted.date.toISOString()).toBe(originalDate);
  });

  it('preserves 409 when PostgreSQL detects a conflict missed by the availability precheck', async () => {
    expect((await book()).statusCode).toBe(201);
    // Reproduce a stale precheck (another writer can reserve before insert).
    // The real repository and PostgreSQL exclusion constraint remain active.
    jest
      .spyOn(app.get(AppointmentAvailabilityService), 'ensureAvailable')
      .mockResolvedValueOnce(undefined);

    const response = await book();

    expect(response.statusCode).toBe(409);
    expect(response.json()).toEqual(conflict);
    expect(await prisma.appointment.count()).toBe(1);
  });

  it('keeps unexpected repository failures as 500 without exposing internal details', async () => {
    const repository = app.get<AppointmentsPrismaRepository>(
      'AppointmentRepository',
    );
    jest
      .spyOn(repository, 'findOverlappingScheduled')
      .mockRejectedValueOnce(new Error('private database connection details'));

    const response = await book();

    expect(response.statusCode).toBe(500);
    expect(response.json()).toEqual({
      statusCode: 500,
      message: 'Internal server error',
    });
    expect(await prisma.appointment.count()).toBe(0);
  });

  it('still requires authentication and rejects rescheduling by a client', async () => {
    const anonymous = await app.inject({
      method: 'POST',
      url: `${api}/appointments`,
      payload: { serviceId, date },
    });
    expect(anonymous.statusCode).toBe(401);
    const created = await book();
    expect(created.statusCode).toBe(201);
    const appointmentId = created.json<{ data: { id: string } }>().data.id;

    const response = await app.inject({
      method: 'PUT',
      url: `${api}/appointments/${appointmentId}`,
      headers: { authorization: clientAuthorization },
      payload: { date: '2030-01-07T13:00:00.000Z' },
    });

    expect(response.statusCode).toBe(403);
  });
});
