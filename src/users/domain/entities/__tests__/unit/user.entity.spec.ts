import { UserDataBuilder } from '@/users/domain/helpers/user-data-builder';
import { UserEntity, UserProps } from '../../user.entity';

describe('User Entity unit tests', () => {
  let props: UserProps;
  let sut: UserEntity;
  beforeEach(() => {
    props = UserDataBuilder({});
    sut = new UserEntity(props);
  });

  it('Constructor should create an instance of User', () => {
    expect(sut.props.name).toBe(props.name);
    expect(sut.props.email).toBe(props.email);
    expect(sut.props.role).toBe(props.role);
    expect(sut.props.password).toBe(props.password);
    expect(sut.props.createdAt).toBeDefined();
  });
  it('Getter of name field', () => {
    expect(sut.name).toBeDefined();
    expect(sut.name).toEqual(props.name);
  });
  it('Getter of role field', () => {
    expect(sut.role).toBeDefined();
    expect(sut.role).toEqual(props.role);
  });
  it('Should update name and role field', () => {
    const newName = 'New Name';
    const newRole = 'barber';
    sut.update(newName, newRole as any);
    expect(sut.name).toEqual(newName);
    expect(sut.role).toEqual(newRole);
  });
  it('Getter of email field', () => {
    expect(sut.email).toBeDefined();
    expect(sut.email).toEqual(props.email);
  });
  it('Getter of password field', () => {
    expect(sut.password).toBeDefined();
    expect(sut.password).toEqual(props.password);
  });
  it('Should update password field', () => {
    const newPassword = 'New Password';
    sut.updatePassword(newPassword);
    expect(sut.password).toEqual(newPassword);
  });
  it('Getter of createdAt field', () => {
    expect(sut.createdAt).toBeDefined();
    expect(sut.createdAt).toBeInstanceOf(Date);
  });
});
