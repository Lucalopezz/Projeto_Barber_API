import { CollectionPresenter } from '@/shared/infrastructure/presenters/collection.presenter';
import { UserOutput } from '@/users/application/dtos/user-output.dto';
import { ListUsersUseCase } from '@/users/application/usecases/list-users.usecase';
import { Role } from '@/users/domain/entities/role.enum';
import { Transform } from 'class-transformer';

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

export class UserCollectionPresenter extends CollectionPresenter {
  data: UserPresenter[];
  constructor(output: ListUsersUseCase.Output) {
    // Separe itens from the pagination props
    const { items, ...paginationProps } = output;
    super(paginationProps);
    this.data = items.map((item) => new UserPresenter(item));
  }
}
