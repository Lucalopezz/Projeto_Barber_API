import { AppModule } from '@/app.module';
import { applyGlobalConfig } from '@/global-config';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { setupPrismaTests } from '@/shared/infrastructure/database/testing/setup-prisma-tests';
import { EnvConfigService } from '@/shared/infrastructure/env-config/env-config.service';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';

describe('Complete barber shop journey (e2e)', () => {
  let app: INestApplication;
  let module: TestingModule;
  let prismaService: PrismaService;

  const api = '/api/v1';
  const password = 'senha-segura';

  const cleanDatabase = async () => {
    await prismaService.appointment.deleteMany();
    await prismaService.barberTimeOff.deleteMany();
    await prismaService.barberSchedule.deleteMany();
    await prismaService.service.deleteMany();
    await prismaService.barberShop.deleteMany();
    await prismaService.user.deleteMany();
  };

  const createUser = async (
    name: string,
    email: string,
    role: 'barber' | 'client',
  ) => {
    const response = await request(app.getHttpServer())
      .post(`${api}/users`)
      .send({ name, email, password, role })
      .expect(201);

    expect(response.body.data).toEqual(
      expect.objectContaining({ name, email, role }),
    );
    expect(response.body.data).not.toHaveProperty('password');

    return response.body.data as {
      id: string;
      name: string;
      email: string;
      role: string;
    };
  };

  const login = async (email: string) => {
    const response = await request(app.getHttpServer())
      .post(`${api}/users/login`)
      .send({ email, password })
      .expect(201);

    expect(response.body).toEqual({
      accessToken: expect.any(String),
    });

    return response.body.accessToken as string;
  };

  beforeAll(async () => {
    setupPrismaTests();

    module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = module.createNestApplication();
    applyGlobalConfig(app, app.get(EnvConfigService));
    await app.init();

    prismaService = app.get(PrismaService);
    await cleanDatabase();
  });

  afterAll(async () => {
    if (prismaService) {
      await cleanDatabase();
    }
    if (app) {
      await app.close();
    }
  });

  it('covers registration, public catalog, booking, professional management and isolation between shops', async () => {
    const owner = await createUser(
      'Bruno Barbeiro',
      'bruno.e2e@example.com',
      'barber',
    );
    const client = await createUser(
      'Carla Cliente',
      'carla.e2e@example.com',
      'client',
    );
    const barberToken = await login(owner.email);
    const clientToken = await login(client.email);

    const createShopResponse = await request(app.getHttpServer())
      .post(`${api}/barber-shops`)
      .set('Authorization', `Bearer ${barberToken}`)
      .send({
        name: 'Barbearia Central',
        address: 'Rua das Flores, 123, Sao Paulo - SP',
        timezone: 'America/Sao_Paulo',
      })
      .expect(201);
    const barberShop = createShopResponse.body.data as {
      id: string;
      ownerId: string;
    };
    expect(barberShop).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        ownerId: owner.id,
      }),
    );

    // Creating a shop promotes the barber to owner, so a fresh JWT carries
    // the role used by the management endpoints.
    const ownerToken = await login(owner.email);

    await request(app.getHttpServer())
      .put(`${api}/appointments/availability/me/schedule`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        schedules: [{ dayOfWeek: 1, startMinute: 480, endMinute: 1080 }],
      })
      .expect(200)
      .expect(({ body }) => {
        expect(body.data).toEqual([
          expect.objectContaining({
            dayOfWeek: 1,
            startMinute: 480,
            endMinute: 1080,
          }),
        ]);
      });

    const createServiceResponse = await request(app.getHttpServer())
      .post(`${api}/services`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        name: 'Corte completo',
        price: 60,
        description: 'Corte e acabamento',
        duration: 45,
      })
      .expect(201);
    const service = createServiceResponse.body.data as {
      id: string;
      barberShopId: string;
    };
    expect(service).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        barberShopId: barberShop.id,
      }),
    );

    await request(app.getHttpServer())
      .get(`${api}/services`)
      .query({ barberShopId: barberShop.id })
      .expect(200)
      .expect(({ body }) => {
        expect(body.data).toEqual([
          expect.objectContaining({
            id: service.id,
            barberShopId: barberShop.id,
            name: 'Corte completo',
          }),
        ]);
        expect(body.meta).toEqual(
          expect.objectContaining({ total: 1, currentPage: 1 }),
        );
      });

    const nextMonday = new Date();
    nextMonday.setUTCHours(12, 0, 0, 0);
    nextMonday.setUTCDate(
      nextMonday.getUTCDate() + ((8 - nextMonday.getUTCDay()) % 7) + 7,
    );
    const initialDate = nextMonday.toISOString();
    const updatedDate = new Date(
      nextMonday.getTime() + 60 * 60 * 1000,
    ).toISOString();
    const createAppointmentResponse = await request(app.getHttpServer())
      .post(`${api}/appointments`)
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ serviceId: service.id, date: initialDate })
      .expect(201);
    const appointment = createAppointmentResponse.body.data as {
      id: string;
      clientId: string;
      barberId: string;
      barberShopId: string;
      serviceId: string;
      status: string;
    };
    expect(appointment).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        clientId: client.id,
        barberId: owner.id,
        barberShopId: barberShop.id,
        serviceId: service.id,
        status: 'scheduled',
      }),
    );

    const otherOwner = await createUser(
      'Otavio Barbeiro',
      'otavio.e2e@example.com',
      'barber',
    );
    const otherBarberToken = await login(otherOwner.email);
    const otherShopResponse = await request(app.getHttpServer())
      .post(`${api}/barber-shops`)
      .set('Authorization', `Bearer ${otherBarberToken}`)
      .send({
        name: 'Barbearia do Bairro',
        address: 'Avenida Brasil, 456, Campinas - SP',
        timezone: 'America/Sao_Paulo',
      })
      .expect(201);
    const otherShopId = otherShopResponse.body.data.id as string;
    const otherOwnerToken = await login(otherOwner.email);

    await request(app.getHttpServer())
      .get(`${api}/appointments/${appointment.id}`)
      .set('Authorization', `Bearer ${otherOwnerToken}`)
      .expect(404)
      .expect({
        statusCode: 404,
        error: 'Not Found',
        message: 'Appointment not found',
      });

    await request(app.getHttpServer())
      .put(`${api}/appointments/${appointment.id}`)
      .set('Authorization', `Bearer ${otherOwnerToken}`)
      .send({ date: updatedDate })
      .expect(403)
      .expect({
        statusCode: 403,
        error: 'Forbidden',
        message: 'You are not authorized to update this appointment',
      });

    const ownerViewResponse = await request(app.getHttpServer())
      .get(`${api}/appointments/${appointment.id}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);
    expect(ownerViewResponse.body.data).toEqual(
      expect.objectContaining({
        id: appointment.id,
        date: initialDate,
        barberShopId: barberShop.id,
      }),
    );

    await request(app.getHttpServer())
      .put(`${api}/appointments/${appointment.id}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ date: updatedDate })
      .expect(200)
      .expect(({ body }) => {
        expect(body.data).toEqual(
          expect.objectContaining({
            id: appointment.id,
            date: updatedDate,
            barberShopId: barberShop.id,
            status: 'scheduled',
          }),
        );
        expect(body.data.barberShopId).not.toBe(otherShopId);
      });
  });
});
