import { AppointmentReminderCandidate } from '@/notifications/application/ports/appointment-reminder.repository';
import { ScheduleAppointmentRemindersUseCase } from '../../schedule-appointment-reminders.usecase';

describe('Agendamento de lembretes vencidos', () => {
  const now = new Date('2030-01-07T12:00:00.000Z');
  const findCandidates = jest.fn();
  const recordReminders = jest.fn();
  const clock = { now: jest.fn(() => now) };
  const repository = { findCandidates, recordReminders };
  const sut = new ScheduleAppointmentRemindersUseCase.UseCase(
    repository,
    clock,
  );
  const candidate = (
    appointmentId: string,
    overrides: Partial<AppointmentReminderCandidate> = {},
  ): AppointmentReminderCandidate => ({
    appointmentId,
    clientId: 'client-1',
    version: 0,
    startsAt: new Date('2030-01-08T12:00:00.000Z'),
    createdAt: new Date('2030-01-06T12:00:00.000Z'),
    serviceName: 'Corte',
    barberShopName: 'Barbearia Escola',
    timezone: 'America/Sao_Paulo',
    ...overrides,
  });

  beforeEach(() => {
    jest.resetAllMocks();
    clock.now.mockReturnValue(now);
    recordReminders.mockResolvedValue(undefined);
  });

  it('captura o relógio uma vez e percorre todas as páginas em lotes de 100', async () => {
    const first = candidate('001');
    const second = candidate('002');
    const third = candidate('003');
    findCandidates
      .mockResolvedValueOnce([first, second])
      .mockResolvedValueOnce([third])
      .mockResolvedValueOnce([]);
    await sut.execute();
    expect(clock.now).toHaveBeenCalledTimes(1);
    expect(findCandidates.mock.calls).toEqual([
      [now, undefined, 100],
      [now, '002', 100],
      [now, '003', 100],
    ]);
    expect(recordReminders.mock.calls).toEqual([[[first, second]], [[third]]]);
  });

  it('avança o cursor mesmo quando uma página contém apenas reservas recentes', async () => {
    const recent = candidate('001', {
      createdAt: new Date('2030-01-07T12:00:00.001Z'),
    });
    const valid = candidate('002');
    findCandidates
      .mockResolvedValueOnce([recent])
      .mockResolvedValueOnce([valid])
      .mockResolvedValueOnce([]);
    await sut.execute();
    expect(findCandidates.mock.calls).toEqual([
      [now, undefined, 100],
      [now, '001', 100],
      [now, '002', 100],
    ]);
    expect(recordReminders).toHaveBeenCalledTimes(1);
    expect(recordReminders).toHaveBeenCalledWith([valid]);
  });

  it('filtra reservas recentes e horários já iniciados ou ainda fora das 24h', async () => {
    const valid = candidate('001');
    findCandidates
      .mockResolvedValueOnce([
        valid,
        candidate('002', { createdAt: new Date('2030-01-07T12:00:00.001Z') }),
        candidate('003', { startsAt: now }),
        candidate('004', { startsAt: new Date('2030-01-08T12:00:00.001Z') }),
      ])
      .mockResolvedValueOnce([]);
    await sut.execute();
    expect(recordReminders).toHaveBeenCalledWith([valid]);
  });

  it('não grava lote vazio quando não há candidatos', async () => {
    findCandidates.mockResolvedValueOnce([]);
    await sut.execute();
    expect(findCandidates).toHaveBeenCalledWith(now, undefined, 100);
    expect(recordReminders).not.toHaveBeenCalled();
  });

  it('recupera um lembrete atrasado enquanto o agendamento permanece futuro', async () => {
    const overdue = candidate('001', {
      startsAt: new Date('2030-01-07T13:00:00.000Z'),
    });
    findCandidates.mockResolvedValueOnce([overdue]).mockResolvedValueOnce([]);
    await sut.execute();
    expect(recordReminders).toHaveBeenCalledWith([overdue]);
  });

  it('propaga falha de gravação para permitir retry da mesma página em outra execução', async () => {
    const item = candidate('001');
    findCandidates.mockImplementation(async (_now, cursor) =>
      cursor ? [] : [item],
    );
    recordReminders.mockRejectedValueOnce(new Error('database unavailable'));
    await expect(sut.execute()).rejects.toThrow('database unavailable');
    await sut.execute();
    expect(recordReminders.mock.calls).toEqual([[[item]], [[item]]]);
    expect(clock.now).toHaveBeenCalledTimes(2);
  });
});
