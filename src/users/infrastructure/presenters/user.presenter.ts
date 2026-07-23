import { CollectionPresenter } from '@/shared/infrastructure/presenters/collection.presenter';
import { UserOutput } from '@/users/application/dtos/user-output.dto';
import { ListUsersUseCase } from '@/users/application/usecases/list-users.usecase';
import { Role } from '@/users/domain/entities/role.enum';
import { Transform } from 'class-transformer';
import {
  BarberShopContextOutput,
  BarberShopRelationship,
  UserContextOutput,
} from '@/users/application/dtos/user-context-output.dto';
import { BarberShopPresenter } from '@/barberShop/infrastructure/presenters/barberShop.presenter';

export class UserPresenter {
  id: string;
  name: string;
  email: string;

  @Transform(({ value }: { value: Role }) => value.toString().toLowerCase())
  role: Role;

  @Transform(({ value }: { value: Date }) => value.toISOString())
  createdAt: Date;

  constructor(output: UserOutput) {
    this.id = output.id;
    this.name = output.name;
    this.role = output.role;
    this.email = output.email;
    this.createdAt = output.createdAt;
  }
}

export class UserBarberShopContextPresenter extends BarberShopPresenter {
  relationship: BarberShopRelationship;

  constructor(output: BarberShopContextOutput) {
    super(output);
    this.relationship = output.relationship;
  }
}

export class UserContextPresenter {
  id: string;
  name: string;
  email: string;

  @Transform(({ value }: { value: Role }) => value.toString().toLowerCase())
  role: Role;

  @Transform(({ value }: { value: Date }) => value.toISOString())
  createdAt: Date;

  barberShop: UserBarberShopContextPresenter | null;

  constructor(output: UserContextOutput) {
    this.id = output.id;
    this.name = output.name;
    this.email = output.email;
    this.role = output.role;
    this.createdAt = output.createdAt;
    this.barberShop = output.barberShop
      ? new UserBarberShopContextPresenter(output.barberShop)
      : null;
  }
}

export class UserCollectionPresenter extends CollectionPresenter {
  data: UserPresenter[];
  constructor(output: ListUsersUseCase.Output) {
    // Separe itens from the pagination props
    const { items, ...paginationProps } = output;
    super(paginationProps);
    this.data = items.map((item) => new UserPresenter(item));
  }
}
