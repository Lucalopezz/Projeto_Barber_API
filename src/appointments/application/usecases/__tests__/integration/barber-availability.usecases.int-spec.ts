import { Test, TestingModule } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import { setupPrismaTests } from '@/shared/infrastructure/database/testing/setup-prisma-tests';
import { DatabaseModule } from '@/shared/infrastructure/database/database.module';
import { UserPrismaRepository } from '@/users/infrastructure/database/prisma/repositories/user-prisma.repository';
import { BarberShopPrismaRepository } from '@/barberShop/infrastructure/database/prisma/repositories/barberShop-prisma.repository';
import { BarberAvailabilityPrismaRepository } from '@/appointments/infrastructure/database/prisma/repositories/barber-availability-prisma.repository';
import { UserEntity } from '@/users/domain/entities/user.entity';
import { UserDataBuilder } from '@/users/domain/helpers/user-data-builder';
import { Role } from '@/users/domain/entities/role.enum';
import { BarberShopEntity } from '@/barberShop/domain/entities/barber-shop.entity';
import { BarberShopDataBuilder } from '@/barberShop/domain/helpers/barberShop-data-builder';
import { UpdateBarberScheduleUseCase } from '../../update-barber-schedule.usecase';
import { CreateBarberTimeOffUseCase } from '../../create-barber-time-off.usecase';
import { DeleteBarberTimeOffUseCase } from '../../delete-barber-time-off.usecase';
import { GetBarberAvailabilityUseCase } from '../../get-barber-availability.usecase';
import { BadRequestError } from '@/shared/application/errors/bad-request-error';

describe('Barber availability use cases integration tests', () => {
  const prismaService = new PrismaClient();
  let module: TestingModule;
  let userRepository: UserPrismaRepository;
  let barberShopRepository: BarberShopPrismaRepository;
  let availabilityRepository: BarberAvailabilityPrismaRepository;
  let owner: UserEntity;
  let barberShop: BarberShopEntity;

  beforeAll(async () => {
    setupPrismaTests();
    module = await Test.createTestingModule({
      imports: [DatabaseModule.forTest(prismaService)],
    }).compile();
    userRepository = new UserPrismaRepository(prismaService as any);
    barberShopRepository = new BarberShopPrismaRepository(prismaService as any);
    availabilityRepository = new BarberAvailabilityPrismaRepository(
      prismaService as any,
    );
  });

  beforeEach(async () => {
    await prismaService.appointment.deleteMany();
    await prismaService.barberTimeOff.deleteMany();
    await prismaService.barberSchedule.deleteMany();
    await prismaService.service.deleteMany();
    await prismaService.barberShop.deleteMany();
    await prismaService.user.deleteMany();

    owner = new UserEntity(
      UserDataBuilder({
        role: Role.owner,
        barberShopId: null,
        email: 'availability-owner@test.com',
      }),
    );
    await userRepository.insert(owner);
    barberShop = new BarberShopEntity(
      BarberShopDataBuilder({
        ownerId: owner.id,
        timezone: 'America/Manaus',
      }),
    );
    await barberShopRepository.insert(barberShop);
    await prismaService.user.update({
      where: { id: owner.id },
      data: { barberShopId: barberShop.id },
    });
  });

  afterAll(async () => {
    await module.close();
  });

  it('should replace and read the professional schedule with its timezone', async () => {
    const updateSchedule = new UpdateBarberScheduleUseCase.UseCase(
      userRepository,
      availabilityRepository,
    );
    const getAvailability = new GetBarberAvailabilityUseCase.UseCase(
      userRepository,
      barberShopRepository,
      availabilityRepository,
    );

    await updateSchedule.execute({
      userId: owner.id,
      schedules: [
        { dayOfWeek: 1, startMinute: 540, endMinute: 720 },
        { dayOfWeek: 1, startMinute: 780, endMinute: 1080 },
      ],
    });
    const output = await getAvailability.execute({ userId: owner.id });

    expect(output.timezone).toBe('America/Manaus');
    expect(output.schedules).toEqual([
      expect.objectContaining({
        dayOfWeek: 1,
        startMinute: 540,
        endMinute: 720,
      }),
      expect.objectContaining({
        dayOfWeek: 1,
        startMinute: 780,
        endMinute: 1080,
      }),
    ]);
  });

  it('should reject overlapping recurring schedule windows', async () => {
    const updateSchedule = new UpdateBarberScheduleUseCase.UseCase(
      userRepository,
      availabilityRepository,
    );

    await expect(
      updateSchedule.execute({
        userId: owner.id,
        schedules: [
          { dayOfWeek: 1, startMinute: 540, endMinute: 720 },
          { dayOfWeek: 1, startMinute: 600, endMinute: 780 },
        ],
      }),
    ).rejects.toThrow(new BadRequestError('Schedule windows must not overlap'));
  });

  it('should create and delete a time off owned by the professional', async () => {
    const createTimeOff = new CreateBarberTimeOffUseCase.UseCase(
      userRepository,
      availabilityRepository,
    );
    const deleteTimeOff = new DeleteBarberTimeOffUseCase.UseCase(
      userRepository,
      availabilityRepository,
    );

    const output = await createTimeOff.execute({
      userId: owner.id,
      startsAt: new Date('2026-08-01T12:00:00.000Z'),
      endsAt: new Date('2026-08-01T15:00:00.000Z'),
      reason: 'Folga',
    });
    expect(
      await prismaService.barberTimeOff.findUnique({
        where: { id: output.id },
      }),
    ).not.toBeNull();

    await deleteTimeOff.execute({ id: output.id, userId: owner.id });
    expect(
      await prismaService.barberTimeOff.findUnique({
        where: { id: output.id },
      }),
    ).toBeNull();
  });
});
