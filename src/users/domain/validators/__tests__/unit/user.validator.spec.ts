import { UserDataBuilder } from '@/users/domain/helpers/user-data-builder';
import {
  UserRules,
  UserValidator,
  UserValidatorFactory,
} from '../../user.validator';
import { UserProps } from '@/users/domain/entities/user.entity';
import { Role } from '@/users/domain/entities/role.enum';

let sut: UserValidator;
let props: UserProps;

describe('UserValidator unit tests', () => {
  beforeEach(() => {
    sut = UserValidatorFactory.create();
    props = UserDataBuilder({});
  });

  it('Invalidation cases for name field', () => {
    let isValid = sut.validate(null as any);
    expect(isValid).toBeFalsy();
    expect(sut.errors['name']).toStrictEqual([
      'name should not be empty',
      'name must be a string',
      'name must be shorter than or equal to 255 characters',
    ]);

    isValid = sut.validate({ ...props, name: '' });
    expect(isValid).toBeFalsy();
    expect(sut.errors['name']).toStrictEqual(['name should not be empty']);

    isValid = sut.validate({ ...props, name: 10 as any });
    expect(isValid).toBeFalsy();
    expect(sut.errors['name']).toStrictEqual([
      'name must be a string',
      'name must be shorter than or equal to 255 characters',
    ]);

    isValid = sut.validate({ ...props, name: 'a'.repeat(256) });
    expect(isValid).toBeFalsy();
    expect(sut.errors['name']).toStrictEqual([
      'name must be shorter than or equal to 255 characters',
    ]);
  });

  it('Invalidation cases for email field', () => {
    let isValid = sut.validate(null as any);
    expect(isValid).toBeFalsy();
    let expectedErrors = [
      'email must be an email',
      'email must be a string',
      'email should not be empty',
      'email must be shorter than or equal to 255 characters',
    ];
    expect(sut.errors['email']).toEqual(expect.arrayContaining(expectedErrors));
    expect(sut.errors['email']).toHaveLength(expectedErrors.length);

    isValid = sut.validate({ ...props, email: '' });
    expect(isValid).toBeFalsy();
    expectedErrors = ['email should not be empty', 'email must be an email'];
    expect(sut.errors['email']).toEqual(expect.arrayContaining(expectedErrors));
    expect(sut.errors['email']).toHaveLength(expectedErrors.length);

    isValid = sut.validate({ ...props, email: 10 as any });
    expect(isValid).toBeFalsy();
    expectedErrors = [
      'email must be an email',
      'email must be a string',
      'email must be shorter than or equal to 255 characters',
    ];
    expect(sut.errors['email']).toEqual(expect.arrayContaining(expectedErrors));
    expect(sut.errors['email']).toHaveLength(expectedErrors.length);

    isValid = sut.validate({ ...props, email: 'a'.repeat(256) });
    expect(isValid).toBeFalsy();
    expectedErrors = [
      'email must be an email',
      'email must be shorter than or equal to 255 characters',
    ];
    expect(sut.errors['email']).toEqual(expect.arrayContaining(expectedErrors));
    expect(sut.errors['email']).toHaveLength(expectedErrors.length);
  });

  it('Invalidation cases for password field', () => {
    let isValid = sut.validate(null as any);
    expect(isValid).toBeFalsy();
    expect(sut.errors['password']).toStrictEqual([
      'password should not be empty',
      'password must be a string',
      'password must be shorter than or equal to 100 characters',
    ]);

    isValid = sut.validate({ ...props, password: '' });
    expect(isValid).toBeFalsy();
    expect(sut.errors['password']).toStrictEqual([
      'password should not be empty',
    ]);

    isValid = sut.validate({ ...props, password: 10 as any });
    expect(isValid).toBeFalsy();
    expect(sut.errors['password']).toStrictEqual([
      'password must be a string',
      'password must be shorter than or equal to 100 characters',
    ]);

    isValid = sut.validate({ ...props, password: 'a'.repeat(256) });
    expect(isValid).toBeFalsy();
    expect(sut.errors['password']).toStrictEqual([
      'password must be shorter than or equal to 100 characters',
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

  it('Valid case for user rules', () => {
    const isValid = sut.validate(props);
    expect(isValid).toBeTruthy();
    expect(sut.validatedData).toStrictEqual(new UserRules(props));
  });
  it('Invalidation cases for role field', () => {
    let isValid = sut.validate(null as any);
    expect(isValid).toBeFalsy();
    expect(sut.errors['role']).toEqual(
      expect.arrayContaining([
        'role must be one of the following values: barber, client',
        'role should not be empty',
      ]),
    );
    expect(sut.errors['role'].length).toBe(2);

    isValid = sut.validate({ ...props, role: '' as any });
    expect(isValid).toBeFalsy();
    expect(sut.errors['role']).toStrictEqual([
      'role must be one of the following values: barber, client',
      'role should not be empty',
    ]);

    isValid = sut.validate({ ...props, role: 'INVALID_ROLE' as any });
    expect(isValid).toBeFalsy();
    expect(sut.errors['role']).toStrictEqual([
      'role must be one of the following values: barber, client',
    ]);
  });

  it('Valid cases for role field', () => {
    let isValid = sut.validate({ ...props, role: Role.client });
    expect(isValid).toBeTruthy();
    expect(sut.errors).toBeNull();

    isValid = sut.validate({ ...props, role: Role.barber });
    expect(isValid).toBeTruthy();
    expect(sut.errors).toBeNull();
  });
});
