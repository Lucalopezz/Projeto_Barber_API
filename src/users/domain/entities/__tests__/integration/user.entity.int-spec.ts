import { UserDataBuilder } from '@/users/domain/helpers/user-data-builder';
import { UserEntity, UserProps } from '../../user.entity';
import { EntityValidationError } from '@/shared/domain/errors/validation-error';
import { Role } from '../../role.enum';

describe('UserEntity integration tests', () => {
  describe('Constructor method', () => {
    it('Should throw an error when creating a user with invalid name', () => {
      let props: UserProps = {
        ...UserDataBuilder({}),
        name: null,
      };
      expect(() => new UserEntity(props)).toThrowError(EntityValidationError);

      props = {
        ...UserDataBuilder({}),
        name: '',
      };
      expect(() => new UserEntity(props)).toThrowError(EntityValidationError);

      props = {
        ...UserDataBuilder({}),
        name: 10 as any,
      };
      expect(() => new UserEntity(props)).toThrowError(EntityValidationError);

      props = {
        ...UserDataBuilder({}),
        name: 'a'.repeat(256),
      };
      expect(() => new UserEntity(props)).toThrowError(EntityValidationError);
    });

    it('Should throw an error when creating a user with invalid role', () => {
      let props: UserProps = {
        ...UserDataBuilder({}),
        role: null,
      };
      expect(() => new UserEntity(props)).toThrowError(EntityValidationError);

      props = {
        ...UserDataBuilder({}),
        role: 'NOT_A_ROLE' as any,
      };
      expect(() => new UserEntity(props)).toThrowError(EntityValidationError);

      props = {
        ...UserDataBuilder({}),
        role: 10 as any,
      };
      expect(() => new UserEntity(props)).toThrowError(EntityValidationError);
    });
    it('Should throw an error when creating a user with invalid email', () => {
      let props: UserProps = {
        ...UserDataBuilder({}),
        email: null,
      };
      expect(() => new UserEntity(props)).toThrowError(EntityValidationError);

      props = {
        ...UserDataBuilder({}),
        email: '',
      };
      expect(() => new UserEntity(props)).toThrowError(EntityValidationError);

      props = {
        ...UserDataBuilder({}),
        email: 10 as any,
      };
      expect(() => new UserEntity(props)).toThrowError(EntityValidationError);

      props = {
        ...UserDataBuilder({}),
        email: 'a'.repeat(256),
      };
      expect(() => new UserEntity(props)).toThrowError(EntityValidationError);
    });

    it('Should throw an error when creating a user with invalid password', () => {
      let props: UserProps = {
        ...UserDataBuilder({}),
        password: null,
      };
      expect(() => new UserEntity(props)).toThrowError(EntityValidationError);

      props = {
        ...UserDataBuilder({}),
        password: '',
      };
      expect(() => new UserEntity(props)).toThrowError(EntityValidationError);

      props = {
        ...UserDataBuilder({}),
        password: 10 as any,
      };
      expect(() => new UserEntity(props)).toThrowError(EntityValidationError);

      props = {
        ...UserDataBuilder({}),
        password: 'a'.repeat(101),
      };
      expect(() => new UserEntity(props)).toThrowError(EntityValidationError);
    });

    it('Should throw an error when creating a user with invalid createdAt', () => {
      let props: UserProps = {
        ...UserDataBuilder({}),
        createdAt: '2023' as any,
      };
      expect(() => new UserEntity(props)).toThrowError(EntityValidationError);

      props = {
        ...UserDataBuilder({}),
        createdAt: 10 as any,
      };
      expect(() => new UserEntity(props)).toThrowError(EntityValidationError);
    });

    it('Should a valid user', () => {
      expect.assertions(0);

      const props: UserProps = {
        ...UserDataBuilder({}),
      };
      new UserEntity(props);
    });
  });

  describe('Update method', () => {
    it('Should throw an error when update a user with invalid name', () => {
      const entity = new UserEntity(UserDataBuilder({}));
      expect(() => entity.update(null, Role.client)).toThrowError(
        EntityValidationError,
      );
      expect(() => entity.update('', Role.client)).toThrowError(
        EntityValidationError,
      );
      expect(() => entity.update(10 as any, Role.client)).toThrowError(
        EntityValidationError,
      );
      expect(() => entity.update('a'.repeat(256), Role.client)).toThrowError(
        EntityValidationError,
      );
    });

    it('Should throw an error when update a user with invalid role', () => {
      const entity = new UserEntity(UserDataBuilder({}));
      expect(() => entity.update('valid name', null)).toThrowError(
        EntityValidationError,
      );
      expect(() => entity.update('valid name', '' as any)).toThrowError(
        EntityValidationError,
      );
      expect(() =>
        entity.update('valid name', 'INVALID_ROLE' as any),
      ).toThrowError(EntityValidationError);
      expect(() => entity.update('valid name', 10 as any)).toThrowError(
        EntityValidationError,
      );
    });

    it('Should update a valid user with name and role', () => {
      const entity = new UserEntity(UserDataBuilder({}));

      // Teste com nome e role válidos
      entity.update('new name', Role.barber);
      expect(entity.name).toBe('new name');
      expect(entity.role).toBe(Role.barber);

      // Teste apenas com nome válido (mantendo role existente)
      const originalRole = entity.role;
      entity.update('another name');
      expect(entity.name).toBe('another name');
      expect(entity.role).toBe(originalRole);
    });
  });

  describe('UpdatePassword method', () => {
    it('Should a invalid user using password field', () => {
      const entity = new UserEntity(UserDataBuilder({}));
      expect(() => entity.updatePassword(null)).toThrowError(
        EntityValidationError,
      );
      expect(() => entity.updatePassword('')).toThrowError(
        EntityValidationError,
      );
      expect(() => entity.updatePassword(10 as any)).toThrowError(
        EntityValidationError,
      );
      expect(() => entity.updatePassword('a'.repeat(101))).toThrowError(
        EntityValidationError,
      );
    });

    it('Should a valid user', () => {
      expect.assertions(0);

      const props: UserProps = {
        ...UserDataBuilder({}),
      };

      const entity = new UserEntity(props);
      entity.updatePassword('other password');
    });
  });
});
