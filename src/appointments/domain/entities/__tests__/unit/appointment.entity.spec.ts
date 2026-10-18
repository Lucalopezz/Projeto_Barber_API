import { AppointmentDataBuilder } from '@/appointments/domain/helpers/appointment-data-builder';
import { AppointmentStatus } from '@/appointments/domain/entities/appointmentStatus.enum';
import {
  AppointmentRules,
  AppointmentValidator,
  AppointmentValidatorFactory,
} from '@/appointments/domain/validators/appointment.validator';
import { AppointmentEntity, AppointmentProps } from '../../appointment.entity';
import { EntityValidationError } from '@/shared/domain/errors/validation-error';
import { ConflictError } from '@/shared/domain/errors/conflict-error';

describe('AppointmentEntity invariants', () => {
  const makeProps = () =>
    AppointmentDataBuilder({
      date: new Date('2030-01-01T12:00:00Z'),
      endDate: new Date('2030-01-01T12:30:00Z'),
      createdAt: new Date('2029-01-01T00:00:00Z'),
    });

  it.each(Object.values(AppointmentStatus))(
    'restores persisted %s appointments',
    (status) => {
      const props = { ...makeProps(), status };
      const entity = new AppointmentEntity(props, 'persisted-id');
      expect(entity.toJSON()).toEqual({ id: 'persisted-id', ...props });
    },
  );

  it('generates identity and creation timestamp without mutating constructor input', () => {
    const props = makeProps();
    delete props.createdAt;
    const entity = new AppointmentEntity(props);
    expect(entity.id).toEqual(expect.any(String));
    expect(entity.createdAt).toBeInstanceOf(Date);
    expect(props.createdAt).toBeUndefined();
  });

  it.each([
    { serviceId: 'invalid' },
    { endDate: new Date('2030-01-01T11:00:00Z') },
    { date: new Date(NaN) },
  ])('rejects invalid constructor data %o', (change) => {
    expect(() => new AppointmentEntity({ ...makeProps(), ...change })).toThrow(
      EntityValidationError,
    );
  });

  it.each([AppointmentStatus.cancelled, AppointmentStatus.completed])(
    'transitions scheduled to %s',
    (status) => {
      const entity = new AppointmentEntity(makeProps());
      entity.updateStatus(status);
      expect(entity.status).toBe(status);
    },
  );

  it.each([AppointmentStatus.cancelled, AppointmentStatus.completed])(
    'keeps %s terminal for every status target',
    (status) => {
      const entity = new AppointmentEntity({ ...makeProps(), status });
      const before = entity.toJSON();
      for (const target of Object.values(AppointmentStatus)) {
        expect(() => entity.updateStatus(target)).toThrow(ConflictError);
        expect(entity.toJSON()).toEqual(before);
      }
    },
  );

  it.each([AppointmentStatus.cancelled, AppointmentStatus.completed])(
    'does not reschedule %s appointments',
    (status) => {
      const entity = new AppointmentEntity({ ...makeProps(), status });
      const before = entity.toJSON();
      expect(() =>
        entity.update(
          new Date('2030-01-02T12:00:00Z'),
          undefined,
          new Date('2030-01-02T12:30:00Z'),
        ),
      ).toThrow(ConflictError);
      expect(entity.toJSON()).toEqual(before);
    },
  );

  it('reschedules and changes service together', () => {
    const entity = new AppointmentEntity(makeProps());
    const serviceId = AppointmentDataBuilder({}).serviceId;
    const date = new Date('2030-01-02T12:00:00Z');
    const endDate = new Date('2030-01-02T13:00:00Z');
    entity.update(date, serviceId, endDate);
    expect(entity.toJSON()).toMatchObject({
      date,
      endDate,
      serviceId,
      status: AppointmentStatus.scheduled,
    });
  });

  it('rejects invalid updates without partial mutation', () => {
    const entity = new AppointmentEntity(makeProps());
    const before = entity.toJSON();
    expect(() =>
      entity.update(
        new Date('2030-01-02T12:00:00Z'),
        'invalid',
        new Date('2030-01-02T13:00:00Z'),
      ),
    ).toThrow(EntityValidationError);
    expect(entity.toJSON()).toEqual(before);
    expect(() =>
      entity.update(undefined, undefined, new Date('2030-01-01T11:00:00Z')),
    ).toThrow(EntityValidationError);
    expect(entity.toJSON()).toEqual(before);
    expect(() => entity.updateStatus('unknown' as AppointmentStatus)).toThrow(
      EntityValidationError,
    );
    expect(entity.toJSON()).toEqual(before);
  });

  it('isolates constructor props and its mutable dates', () => {
    const props = makeProps();
    const entity = new AppointmentEntity(props);
    const before = entity.toJSON();
    props.status = AppointmentStatus.completed;
    props.serviceId = 'invalid';
    props.date.setUTCFullYear(2000);
    props.endDate.setUTCFullYear(2000);
    props.createdAt.setUTCFullYear(2000);
    expect(entity.toJSON()).toEqual(before);
  });

  it('isolates mutation inputs after a successful update', () => {
    const entity = new AppointmentEntity(makeProps());
    const date = new Date('2030-01-02T12:00:00Z');
    const endDate = new Date('2030-01-02T13:00:00Z');
    entity.update(date, undefined, endDate);
    const dateTimestamp = date.getTime();
    const endTimestamp = endDate.getTime();
    date.setUTCFullYear(2000);
    endDate.setUTCFullYear(2000);
    expect(entity.date.getTime()).toBe(dateTimestamp);
    expect(entity.endDate.getTime()).toBe(endTimestamp);
  });

  it.each(['date', 'endDate', 'createdAt'] as const)(
    'detaches the constructor %s reference',
    (field) => {
      const props = makeProps();
      const timestamp = props[field].getTime();
      const entity = new AppointmentEntity(props);
      props[field].setTime(0);
      expect(entity[field].getTime()).toBe(timestamp);
    },
  );

  it.each(['date', 'endDate', 'createdAt'] as const)(
    'detaches every publicly exposed %s reference',
    (field) => {
      const entity = new AppointmentEntity(makeProps());
      const timestamp = entity[field].getTime();
      entity.props[field].setTime(0);
      expect(entity[field].getTime()).toBe(timestamp);
      entity.toJSON()[field].setTime(0);
      expect(entity[field].getTime()).toBe(timestamp);
      entity[field].setTime(0);
      expect(entity[field].getTime()).toBe(timestamp);
    },
  );

  it('exposes detached snapshots through props, toJSON and Date getters', () => {
    const entity = new AppointmentEntity(makeProps());
    const before = entity.toJSON();
    const props = entity.props;
    props.status = AppointmentStatus.completed;
    props.serviceId = 'invalid';
    props.date.setUTCFullYear(2000);
    props.endDate.setUTCFullYear(2000);
    props.createdAt.setUTCFullYear(2000);
    const json = entity.toJSON();
    json.status = AppointmentStatus.cancelled;
    json.date.setUTCFullYear(1990);
    json.endDate.setUTCFullYear(1990);
    json.createdAt.setUTCFullYear(1990);
    entity.date.setUTCFullYear(1980);
    entity.endDate.setUTCFullYear(1980);
    entity.createdAt.setUTCFullYear(1980);
    expect(entity.toJSON()).toEqual(before);
  });
});

let sut: AppointmentValidator;
let props: AppointmentProps;

describe('AppointmentValidator unit tests', () => {
  beforeEach(() => {
    sut = AppointmentValidatorFactory.create();
    props = AppointmentDataBuilder({});
  });

  it('Invalidation cases for date field', () => {
    let isValid = sut.validate(null as any);
    expect(isValid).toBeFalsy();
    expect(sut.errors['date']).toStrictEqual([
      'date should not be empty',
      'date must be a Date instance',
    ]);

    isValid = sut.validate({ ...props, date: '' as any });
    expect(isValid).toBeFalsy();
    expect(sut.errors['date']).toStrictEqual([
      'date should not be empty',
      'date must be a Date instance',
    ]);

    isValid = sut.validate({ ...props, date: 10 as any });
    expect(isValid).toBeFalsy();
    expect(sut.errors['date']).toStrictEqual(['date must be a Date instance']);

    isValid = sut.validate({ ...props, date: '2023-01-01' as any });
    expect(isValid).toBeFalsy();
    expect(sut.errors['date']).toStrictEqual(['date must be a Date instance']);
  });

  it('Invalidation cases for status field', () => {
    let isValid = sut.validate(null as any);
    expect(isValid).toBeFalsy();
    expect(sut.errors['status']).toEqual(
      expect.arrayContaining([
        'status must be one of the following values: scheduled, completed, cancelled',
        'status should not be empty',
      ]),
    );
    expect(sut.errors['status'].length).toBe(2);

    isValid = sut.validate({ ...props, status: '' as any });
    expect(isValid).toBeFalsy();
    expect(sut.errors['status']).toEqual(
      expect.arrayContaining([
        'status must be one of the following values: scheduled, completed, cancelled',
        'status should not be empty',
      ]),
    );
    expect(sut.errors['status'].length).toBe(2);

    isValid = sut.validate({ ...props, status: 'INVALID_STATUS' as any });
    expect(isValid).toBeFalsy();
    expect(sut.errors['status']).toStrictEqual([
      'status must be one of the following values: scheduled, completed, cancelled',
    ]);

    isValid = sut.validate({ ...props, status: 10 as any });
    expect(isValid).toBeFalsy();
    expect(sut.errors['status']).toStrictEqual([
      'status must be one of the following values: scheduled, completed, cancelled',
    ]);
  });

  it('Invalidation cases for clientId field', () => {
    let isValid = sut.validate(null as any);
    expect(isValid).toBeFalsy();
    expect(sut.errors['clientId']).toStrictEqual([
      'clientId must be a UUID',
      'clientId should not be empty',
    ]);

    isValid = sut.validate({ ...props, clientId: '' });
    expect(isValid).toBeFalsy();
    expect(sut.errors['clientId']).toStrictEqual([
      'clientId must be a UUID',
      'clientId should not be empty',
    ]);

    isValid = sut.validate({ ...props, clientId: 10 as any });
    expect(isValid).toBeFalsy();
    expect(sut.errors['clientId']).toStrictEqual(['clientId must be a UUID']);
  });

  it('Invalidation cases for serviceId field', () => {
    let isValid = sut.validate(null as any);
    expect(isValid).toBeFalsy();
    expect(sut.errors['serviceId']).toStrictEqual([
      'serviceId must be a UUID',
      'serviceId should not be empty',
    ]);

    isValid = sut.validate({ ...props, serviceId: '' });
    expect(isValid).toBeFalsy();
    expect(sut.errors['serviceId']).toStrictEqual([
      'serviceId must be a UUID',
      'serviceId should not be empty',
    ]);

    isValid = sut.validate({ ...props, serviceId: 10 as any });
    expect(isValid).toBeFalsy();
    expect(sut.errors['serviceId']).toStrictEqual(['serviceId must be a UUID']);
  });

  it('Invalidation cases for barberId field', () => {
    let isValid = sut.validate(null as any);
    expect(isValid).toBeFalsy();
    expect(sut.errors['barberId']).toStrictEqual([
      'barberId must be a UUID',
      'barberId should not be empty',
    ]);

    isValid = sut.validate({ ...props, barberId: '' });
    expect(isValid).toBeFalsy();
    expect(sut.errors['barberId']).toStrictEqual([
      'barberId must be a UUID',
      'barberId should not be empty',
    ]);

    isValid = sut.validate({ ...props, barberId: 10 as any });
    expect(isValid).toBeFalsy();
    expect(sut.errors['barberId']).toStrictEqual(['barberId must be a UUID']);
  });

  it('Invalidation cases for barberShopId field', () => {
    let isValid = sut.validate(null as any);
    expect(isValid).toBeFalsy();
    expect(sut.errors['barberShopId']).toStrictEqual([
      'barberShopId must be a UUID',
      'barberShopId should not be empty',
    ]);

    isValid = sut.validate({ ...props, barberShopId: '' });
    expect(isValid).toBeFalsy();
    expect(sut.errors['barberShopId']).toStrictEqual([
      'barberShopId must be a UUID',
      'barberShopId should not be empty',
    ]);

    isValid = sut.validate({ ...props, barberShopId: 10 as any });
    expect(isValid).toBeFalsy();
    expect(sut.errors['barberShopId']).toStrictEqual([
      'barberShopId must be a UUID',
    ]);
  });

  it('Invalidation cases for createdAt field', () => {
    let isValid = sut.validate({ ...props, createdAt: 10 as any });
    expect(isValid).toBeFalsy();
    expect(sut.errors['createdAt']).toStrictEqual([
      'createdAt must be a Date instance',
    ]);

    isValid = sut.validate({ ...props, createdAt: '2023' as any });
    expect(isValid).toBeFalsy();
    expect(sut.errors['createdAt']).toStrictEqual([
      'createdAt must be a Date instance',
    ]);
  });

  it('Valid case for appointment rules', () => {
    const isValid = sut.validate(props);
    expect(isValid).toBeTruthy();
    expect(sut.validatedData).toStrictEqual(new AppointmentRules(props));
  });

  it('Valid cases for status field', () => {
    let isValid = sut.validate({
      ...props,
      status: AppointmentStatus.scheduled,
    });
    expect(isValid).toBeTruthy();
    expect(sut.errors).toBeNull();

    isValid = sut.validate({ ...props, status: AppointmentStatus.completed });
    expect(isValid).toBeTruthy();
    expect(sut.errors).toBeNull();

    isValid = sut.validate({ ...props, status: AppointmentStatus.cancelled });
    expect(isValid).toBeTruthy();
    expect(sut.errors).toBeNull();
  });
});
