import { AppModule } from '@/app.module';
import { applyGlobalConfig } from '@/global-config';
import { EnvConfigService } from '@/shared/infrastructure/env-config/env-config.service';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { setupPrismaTests } from '@/shared/infrastructure/database/testing/setup-prisma-tests';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { randomUUID } from 'node:crypto';

describe('multi-barber booking (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const api = '/api/v1';
  const password = 'senha-segura';

  const clean = async () => {
    await prisma.appointment.deleteMany();
    await prisma.barberTimeOff.deleteMany();
    await prisma.barberSchedule.deleteMany();
    await prisma.service.deleteMany();
    await prisma.barberShop.deleteMany();
    await prisma.user.deleteMany();
  };

  const register = async (name: string, email: string, role: string) => {
    const response = await request(app.getHttpServer())
      .post(`${api}/users`)
      .send({ name, email, password, role })
      .expect(201);
    const login = await request(app.getHttpServer())
      .post(`${api}/users/login`)
      .send({ email, password })
      .expect(201);
    return {
      id: response.body.data.id as string,
      token: login.body.accessToken as string,
    };
  };

  beforeAll(async () => {
    setupPrismaTests();
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = module.createNestApplication();
    applyGlobalConfig(app, app.get(EnvConfigService));
    await app.init();
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await clean();
  });

  afterAll(async () => {
    if (prisma) await clean();
    if (app) await app.close();
  });

  it('invites a barber, books that barber, and keeps another barber free', async () => {
    const owner = await register('Owner', 'owner.multi@example.com', 'barber');
    const staff = await register('Staff', 'staff.multi@example.com', 'barber');
    const client = await register(
      'Client',
      'client.multi@example.com',
      'client',
    );
    const shopResponse = await request(app.getHttpServer())
      .post(`${api}/barber-shops`)
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ name: 'Shop', address: 'Rua das Flores, 123, Sao Paulo - SP' })
      .expect(201);
    const shopId = shopResponse.body.data.id as string;
    const invitationResponse = await request(app.getHttpServer())
      .post(`${api}/barber-shops/${shopId}/invitations`)
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ email: 'staff.multi@example.com' })
      .expect(201);
    const invitationId = invitationResponse.body.data.id as string;
    await request(app.getHttpServer())
      .post(`${api}/barber-shops/${shopId}/invitations`)
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ email: 'staff.multi@example.com' })
      .expect(409);
    await request(app.getHttpServer())
      .post(`${api}/barber-shops/invitations/${invitationId}/accept`)
      .set('Authorization', `Bearer ${client.token}`)
      .expect(404);
    await request(app.getHttpServer())
      .get(`${api}/barber-shops/invitations/me`)
      .set('Authorization', `Bearer ${staff.token}`)
      .expect(200)
      .expect(({ body }) =>
        expect(body.data).toEqual([
          expect.objectContaining({ id: invitationId }),
        ]),
      );
    await request(app.getHttpServer())
      .post(`${api}/barber-shops/invitations/${invitationId}/accept`)
      .set('Authorization', `Bearer ${staff.token}`)
      .expect(201);

    await request(app.getHttpServer())
      .get(`${api}/barber-shops/${shopId}/barbers`)
      .expect(200)
      .expect(({ body }) =>
        expect(body.data.map((barber: { id: string }) => barber.id)).toEqual(
          expect.arrayContaining([owner.id, staff.id]),
        ),
      );
    await request(app.getHttpServer())
      .post(`${api}/barber-shops/${shopId}/invitations`)
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ email: 'staff.multi@example.com' })
      .expect(409);

    for (const token of [owner.token, staff.token]) {
      await request(app.getHttpServer())
        .put(`${api}/appointments/availability/me/schedule`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          schedules: [{ dayOfWeek: 1, startMinute: 540, endMinute: 720 }],
        })
        .expect(200);
    }
    const service = await request(app.getHttpServer())
      .post(`${api}/services`)
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ name: 'Cut', price: 40, description: 'Haircut', duration: 30 })
      .expect(201);
    const serviceId = service.body.data.id as string;
    const nextMonday = new Date();
    nextMonday.setUTCHours(12, 0, 0, 0);
    nextMonday.setUTCDate(
      nextMonday.getUTCDate() + ((8 - nextMonday.getUTCDay()) % 7) + 7,
    );
    const date = nextMonday.toISOString();
    const localDate = date.slice(0, 10);

    await request(app.getHttpServer())
      .post(`${api}/appointments`)
      .set('Authorization', `Bearer ${client.token}`)
      .send({ serviceId, barberId: randomUUID(), date })
      .expect(400);

    const booking = await request(app.getHttpServer())
      .post(`${api}/appointments`)
      .set('Authorization', `Bearer ${client.token}`)
      .send({ serviceId, barberId: staff.id, date })
      .expect(201)
      .expect(({ body }) => expect(body.data.barberId).toBe(staff.id));
    await request(app.getHttpServer())
      .get(`${api}/barber-shops/${shopId}/availability`)
      .query({ serviceId, barberId: staff.id, date: localDate })
      .expect(200)
      .expect(({ body }) =>
        expect(
          body.data.slots.some(
            (slot: { startsAt: string }) => slot.startsAt === date,
          ),
        ).toBe(false),
      );
    await request(app.getHttpServer())
      .get(`${api}/barber-shops/${shopId}/availability`)
      .query({ serviceId, barberId: owner.id, date: localDate })
      .expect(200)
      .expect(({ body }) =>
        expect(
          body.data.slots.some(
            (slot: { startsAt: string }) => slot.startsAt === date,
          ),
        ).toBe(true),
      );
    await request(app.getHttpServer())
      .get(`${api}/appointments`)
      .set('Authorization', `Bearer ${staff.token}`)
      .expect(200)
      .expect(({ body }) => expect(body.data).toHaveLength(1));
    await request(app.getHttpServer())
      .delete(`${api}/barber-shops/${shopId}/barbers/${staff.id}`)
      .set('Authorization', `Bearer ${owner.token}`)
      .expect(409);

    await request(app.getHttpServer())
      .patch(`${api}/appointments/${booking.body.data.id}`)
      .set('Authorization', `Bearer ${client.token}`)
      .send({ newStatus: 'cancelled' })
      .expect(200);
    await request(app.getHttpServer())
      .delete(`${api}/barber-shops/${shopId}/barbers/${staff.id}`)
      .set('Authorization', `Bearer ${owner.token}`)
      .expect(204);
    await request(app.getHttpServer())
      .get(`${api}/barber-shops/${shopId}/barbers`)
      .expect(200)
      .expect(({ body }) =>
        expect(body.data.map((barber: { id: string }) => barber.id)).toEqual([
          owner.id,
        ]),
      );
  });

  it('keeps invitation management with the owner and lets the recipient decline', async () => {
    const owner = await register(
      'Owner',
      'owner.invites@example.com',
      'barber',
    );
    const staff = await register(
      'Staff',
      'staff.invites@example.com',
      'barber',
    );
    const client = await register(
      'Client',
      'client.invites@example.com',
      'client',
    );
    const shop = await request(app.getHttpServer())
      .post(`${api}/barber-shops`)
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ name: 'Shop', address: 'Rua das Flores, 123, Sao Paulo - SP' })
      .expect(201);
    const shopId = shop.body.data.id as string;

    await request(app.getHttpServer())
      .post(`${api}/barber-shops/${shopId}/invitations`)
      .set('Authorization', `Bearer ${client.token}`)
      .send({ email: 'staff.invites@example.com' })
      .expect(403);
    const first = await request(app.getHttpServer())
      .post(`${api}/barber-shops/${shopId}/invitations`)
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ email: 'staff.invites@example.com' })
      .expect(201);
    const firstId = first.body.data.id as string;
    await request(app.getHttpServer())
      .get(`${api}/barber-shops/${shopId}/invitations`)
      .set('Authorization', `Bearer ${owner.token}`)
      .expect(200)
      .expect(({ body }) =>
        expect(body.data).toEqual([expect.objectContaining({ id: firstId })]),
      );
    await request(app.getHttpServer())
      .post(`${api}/barber-shops/invitations/${firstId}/decline`)
      .set('Authorization', `Bearer ${staff.token}`)
      .expect(204);
    await request(app.getHttpServer())
      .get(`${api}/barber-shops/${shopId}/invitations`)
      .set('Authorization', `Bearer ${owner.token}`)
      .expect(200)
      .expect(({ body }) => expect(body.data).toEqual([]));

    const second = await request(app.getHttpServer())
      .post(`${api}/barber-shops/${shopId}/invitations`)
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ email: 'staff.invites@example.com' })
      .expect(201);
    await request(app.getHttpServer())
      .delete(
        `${api}/barber-shops/${shopId}/invitations/${second.body.data.id}`,
      )
      .set('Authorization', `Bearer ${owner.token}`)
      .expect(204);
    await request(app.getHttpServer())
      .get(`${api}/barber-shops/invitations/me`)
      .set('Authorization', `Bearer ${staff.token}`)
      .expect(200)
      .expect(({ body }) => expect(body.data).toEqual([]));
  });
});
