import {
  appointmentReminderEventKey,
  isAppointmentReminderDue,
  REMINDER_LEAD_TIME_MS,
} from '../../appointment-reminder-policy';

describe('Política de lembrete de 24 horas', () => {
  const startsAt = new Date('2030-01-08T12:00:00.000Z');
  const dueAt = new Date('2030-01-07T12:00:00.000Z');
  const createdAt = new Date('2030-01-06T12:00:00.000Z');

  it('usa antecedência de exatamente 24 horas em milissegundos', () => {
    expect(REMINDER_LEAD_TIME_MS).toBe(86_400_000);
  });

  it.each([
    {
      name: 'um milissegundo antes das 24h',
      now: new Date(dueAt.getTime() - 1),
      expected: false,
    },
    { name: 'exatamente nas 24h', now: dueAt, expected: true },
    {
      name: 'um milissegundo depois das 24h',
      now: new Date(dueAt.getTime() + 1),
      expected: true,
    },
    {
      name: 'depois de uma parada do worker',
      now: new Date('2030-01-08T10:00:00.000Z'),
      expected: true,
    },
    {
      name: 'um milissegundo antes do início',
      now: new Date(startsAt.getTime() - 1),
      expected: true,
    },
    { name: 'no início do agendamento', now: startsAt, expected: false },
    {
      name: 'um milissegundo após o início',
      now: new Date(startsAt.getTime() + 1),
      expected: false,
    },
  ])('$name: $expected', ({ now, expected }) => {
    expect(isAppointmentReminderDue(startsAt, createdAt, now)).toBe(expected);
  });

  it('inclui reserva criada exatamente 24 horas antes', () => {
    expect(isAppointmentReminderDue(startsAt, dueAt, dueAt)).toBe(true);
  });

  it.each([1, 60 * 60 * 1000, REMINDER_LEAD_TIME_MS - 1])(
    'não gera lembrete para reserva criada %i ms depois do limite',
    (delay) => {
      expect(
        isAppointmentReminderDue(
          startsAt,
          new Date(dueAt.getTime() + delay),
          new Date(startsAt.getTime() - 1),
        ),
      ).toBe(false);
    },
  );

  it.each(['startsAt', 'createdAt', 'now'])(
    'não considera elegível uma data inválida em %s',
    (field) => {
      const input = {
        startsAt,
        createdAt,
        now: dueAt,
        [field]: new Date('invalid'),
      };
      expect(
        isAppointmentReminderDue(input.startsAt, input.createdAt, input.now),
      ).toBe(false);
    },
  );

  it('a chave é estável para a mesma reserva, cliente, revisão e horário', () => {
    const candidate = {
      appointmentId: 'appointment-1',
      clientId: 'client-1',
      version: 2,
      startsAt,
    };
    expect(appointmentReminderEventKey(candidate)).toBe(
      `appointment-reminder-appointment-1-client-1-v2-${startsAt.getTime()}`,
    );
    expect(
      appointmentReminderEventKey({
        ...candidate,
        startsAt: new Date(startsAt),
      }),
    ).toBe(appointmentReminderEventKey(candidate));
  });

  it.each([
    { appointmentId: 'other-appointment' },
    { clientId: 'other-client' },
    { version: 3 },
    { startsAt: new Date(startsAt.getTime() + 1) },
  ])(
    'revisões, datas ou destinatários distintos não reutilizam a chave: %p',
    (change) => {
      const candidate = {
        appointmentId: 'appointment-1',
        clientId: 'client-1',
        version: 2,
        startsAt,
      };
      expect(appointmentReminderEventKey({ ...candidate, ...change })).not.toBe(
        appointmentReminderEventKey(candidate),
      );
    },
  );
});
