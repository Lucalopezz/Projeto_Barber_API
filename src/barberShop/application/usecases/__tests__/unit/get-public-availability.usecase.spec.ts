import { AppointmentAvailabilityService } from '@/appointments/application/services/appointment-availability.service';
import { BarberScheduleEntity } from '@/appointments/domain/entities/barber-schedule.entity';
import { BadRequestError } from '@/shared/application/errors/bad-request-error';
import { randomUUID } from 'node:crypto';
import { GetPublicAvailabilityUseCase } from '../../get-public-availability.usecase';

describe('GetPublicAvailabilityUseCase', () => {
  const barberShopId = randomUUID();
  const ownerId = randomUUID();
  const serviceId = randomUUID();
  const barberShopRepository = { findById: jest.fn() };
  const servicesRepository = { findById: jest.fn() };
  const availabilityRepository = { findSchedules: jest.fn() };
  const availabilityService = { isAvailable: jest.fn() };
  const sut = new GetPublicAvailabilityUseCase.UseCase(
    barberShopRepository as any,
    servicesRepository as any,
    availabilityRepository as any,
    availabilityService as unknown as AppointmentAvailabilityService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    barberShopRepository.findById.mockResolvedValue({
      id: barberShopId,
      ownerId,
      timezone: 'America/Sao_Paulo',
    });
    servicesRepository.findById.mockResolvedValue({
      id: serviceId,
      barberShopId,
      duration: 45,
    });
    availabilityRepository.findSchedules.mockResolvedValue([
      new BarberScheduleEntity({
        barberId: ownerId,
        dayOfWeek: 2,
        startMinute: 540,
        endMinute: 660,
      }),
    ]);
    availabilityService.isAvailable.mockResolvedValue(true);
  });

  it('returns 30-minute slots that fully fit the service in the local schedule', async () => {
    const output = await sut.execute({
      barberShopId,
      serviceId,
      date: '2026-07-28',
    });

    expect(output).toEqual({
      date: '2026-07-28',
      timezone: 'America/Sao_Paulo',
      serviceId,
      slots: [
        {
          startsAt: new Date('2026-07-28T12:00:00.000Z'),
          endsAt: new Date('2026-07-28T12:45:00.000Z'),
        },
        {
          startsAt: new Date('2026-07-28T12:30:00.000Z'),
          endsAt: new Date('2026-07-28T13:15:00.000Z'),
        },
        {
          startsAt: new Date('2026-07-28T13:00:00.000Z'),
          endsAt: new Date('2026-07-28T13:45:00.000Z'),
        },
      ],
    });
    expect(availabilityRepository.findSchedules).toHaveBeenCalledWith(
      ownerId,
      2,
    );
  });

  it('omits slots rejected by the availability rule', async () => {
    availabilityService.isAvailable.mockResolvedValueOnce(false);

    const output = await sut.execute({
      barberShopId,
      serviceId,
      date: '2026-07-28',
    });

    expect(output.slots).toHaveLength(2);
    expect(output.slots[0].startsAt).toEqual(
      new Date('2026-07-28T12:30:00.000Z'),
    );
  });

  it('rejects a service that belongs to another barber shop', async () => {
    servicesRepository.findById.mockResolvedValue({
      id: serviceId,
      barberShopId: randomUUID(),
      duration: 45,
    });

    await expect(
      sut.execute({ barberShopId, serviceId, date: '2026-07-28' }),
    ).rejects.toThrow(
      new BadRequestError('Service does not belong to BarberShop'),
    );
  });
});
