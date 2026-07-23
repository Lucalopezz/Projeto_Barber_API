import { instanceToPlain } from 'class-transformer';
import {
  UserCollectionPresenter,
  UserContextPresenter,
  UserPresenter,
} from '../../user.presenter';
import { PaginationPresenter } from '@/shared/infrastructure/presenters/pagination.presenter';
import { Role } from '@/users/domain/entities/role.enum';

describe('UserPresenter unit tests', () => {
  const createdAt = new Date();
  const props = {
    id: 'e71c52a2-9710-4a96-a08e-144af4209b5d',
    name: 'test name',
    email: 'a@a.com',
    role: Role.barber,
    password: 'fake',
    createdAt,
  };
  let sut: UserPresenter;

  beforeEach(() => {
    sut = new UserPresenter(props);
  });

  describe('constructor', () => {
    it('should be defined', () => {
      expect(sut.id).toEqual(props.id);
      expect(sut.name).toEqual(props.name);
      expect(sut.email).toEqual(props.email);
      expect(sut.createdAt).toEqual(props.createdAt);
    });
  });

  it('should presenter data', () => {
    const output = instanceToPlain(sut);
    expect(output).toStrictEqual({
      id: 'e71c52a2-9710-4a96-a08e-144af4209b5d',
      name: 'test name',
      email: 'a@a.com',
      role: 'barber',
      createdAt: createdAt.toISOString(),
    });
  });
});

describe('UserContextPresenter unit tests', () => {
  const createdAt = new Date();

  it('should present an owner with barber shop context', () => {
    const sut = new UserContextPresenter({
      id: 'e71c52a2-9710-4a96-a08e-144af4209b5d',
      name: 'test name',
      email: 'a@a.com',
      role: Role.owner,
      createdAt,
      barberShop: {
        id: '6ec9ba0c-9195-4596-8db5-19f776a788f4',
        name: 'Test Barber Shop',
        address: 'Rua A, 10, São Paulo - SP',
        ownerId: 'e71c52a2-9710-4a96-a08e-144af4209b5d',
        relationship: 'owner',
        createdAt,
      },
    });

    expect(instanceToPlain(sut)).toStrictEqual({
      id: 'e71c52a2-9710-4a96-a08e-144af4209b5d',
      name: 'test name',
      email: 'a@a.com',
      role: 'owner',
      createdAt: createdAt.toISOString(),
      barberShop: {
        id: '6ec9ba0c-9195-4596-8db5-19f776a788f4',
        name: 'Test Barber Shop',
        address: 'Rua A, 10, São Paulo - SP',
        ownerId: 'e71c52a2-9710-4a96-a08e-144af4209b5d',
        relationship: 'owner',
        createdAt: createdAt.toISOString(),
      },
    });
  });

  it('should present null context when user has no barber shop', () => {
    const sut = new UserContextPresenter({
      id: 'e71c52a2-9710-4a96-a08e-144af4209b5d',
      name: 'test name',
      email: 'a@a.com',
      role: Role.client,
      createdAt,
      barberShop: null,
    });

    expect(instanceToPlain(sut)).toStrictEqual({
      id: 'e71c52a2-9710-4a96-a08e-144af4209b5d',
      name: 'test name',
      email: 'a@a.com',
      role: 'client',
      createdAt: createdAt.toISOString(),
      barberShop: null,
    });
  });
});

describe('UserCollectionPresenter unit tests', () => {
  const createdAt = new Date();
  const props = {
    id: 'e71c52a2-9710-4a96-a08e-144af4209b5d',
    name: 'test name',
    email: 'a@a.com',
    role: Role.barber,
    password: 'fake',
    createdAt,
  };

  describe('constructor', () => {
    it('should set values', () => {
      const sut = new UserCollectionPresenter({
        items: [props],
        currentPage: 1,
        perPage: 2,
        lastPage: 1,
        total: 1,
      });
      expect(sut.meta).toBeInstanceOf(PaginationPresenter);
      expect(sut.meta).toStrictEqual(
        new PaginationPresenter({
          currentPage: 1,
          perPage: 2,
          lastPage: 1,
          total: 1,
        }),
      );
      expect(sut.data).toStrictEqual([new UserPresenter(props)]);
    });
  });

  it('should presenter data', () => {
    let sut = new UserCollectionPresenter({
      items: [props],
      currentPage: 1,
      perPage: 2,
      lastPage: 1,
      total: 1,
    });
    let output = instanceToPlain(sut);
    expect(output).toStrictEqual({
      data: [
        {
          id: 'e71c52a2-9710-4a96-a08e-144af4209b5d',
          name: 'test name',
          email: 'a@a.com',
          role: 'barber',
          createdAt: createdAt.toISOString(),
        },
      ],
      meta: {
        currentPage: 1,
        perPage: 2,
        lastPage: 1,
        total: 1,
      },
    });

    sut = new UserCollectionPresenter({
      items: [props],
      currentPage: '1' as any,
      perPage: '2' as any,
      lastPage: '1' as any,
      total: '1' as any,
    });
    output = instanceToPlain(sut);
    expect(output).toStrictEqual({
      data: [
        {
          id: 'e71c52a2-9710-4a96-a08e-144af4209b5d',
          name: 'test name',
          email: 'a@a.com',
          role: 'barber',
          createdAt: createdAt.toISOString(),
        },
      ],
      meta: {
        currentPage: 1,
        perPage: 2,
        lastPage: 1,
        total: 1,
      },
    });
  });
});
