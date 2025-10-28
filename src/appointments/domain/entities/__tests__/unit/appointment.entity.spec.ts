import { AppointmentDataBuilder } from '@/appointments/domain/helpers/appointment-data-builder';
import { AppointmentStatus } from '@/appointments/domain/entities/appointmentStatus.enum';
import {
  AppointmentRules,
  AppointmentValidator,
  AppointmentValidatorFactory,
} from '@/appointments/domain/validators/appointment.validator';
import { AppointmentProps } from '../../appointment.entity';

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
