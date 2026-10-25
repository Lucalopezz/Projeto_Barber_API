import { randomUUID } from 'node:crypto';
import { NotificationEntity } from '../../notification.entity';
import { NotificationProps, NotificationType } from '../../notification.props';
import { EntityValidationError } from '@/shared/domain/errors/validation-error';

describe('NotificationEntity', () => {
  const props: NotificationProps = {
    userId: randomUUID(),
    appointmentId: randomUUID(),
    eventKey: 'appointment-created-1',
    type: NotificationType.appointmentCreated,
    serviceName: 'Corte',
    barberShopName: 'Escola',
    startsAt: new Date('2030-01-07T12:00:00Z'),
    timezone: 'America/Sao_Paulo',
  };

  it('cria uma confirmação não lida com data de criação', () => {
    const entity = new NotificationEntity(props);
    expect(entity.toJSON()).toEqual(
      expect.objectContaining({
        ...props,
        id: expect.any(String),
        readAt: null,
        createdAt: expect.any(Date),
      }),
    );
  });

  it.each([
    { userId: 'invalid' },
    { appointmentId: '' },
    { eventKey: '' },
    { type: 'invalid' },
    { serviceName: '' },
    { barberShopName: '' },
    { startsAt: new Date('invalid') },
    { timezone: 'invalid' },
    { readAt: new Date('invalid') },
  ])('rejeita dados inválidos: %p', (invalid) => {
    expect(
      () =>
        new NotificationEntity({ ...props, ...invalid } as NotificationProps),
    ).toThrow(EntityValidationError);
  });
});
