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
import { ApiProperty } from '@nestjs/swagger';

export class UserPresenter {
  @ApiProperty({
    format: 'uuid',
    example: '72eb0d7d-f0a8-4a2b-9ea3-27c8792f4a21',
  })
  id: string;
  @ApiProperty({ example: 'Ana Souza' })
  name: string;
  @ApiProperty({ format: 'email', example: 'ana@example.com' })
  email: string;

  @ApiProperty({ enum: Role, example: Role.client })
  @Transform(({ value }: { value: Role }) => value.toString().toLowerCase())
  role: Role;

  @ApiProperty({
    type: String,
    format: 'date-time',
    example: '2026-07-23T12:00:00.000Z',
  })
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
  @ApiProperty({ enum: ['owner', 'barber'], example: 'owner' })
  relationship: BarberShopRelationship;

  constructor(output: BarberShopContextOutput) {
    super(output);
    this.relationship = output.relationship;
  }
}

export class UserContextPresenter {
  @ApiProperty({
    format: 'uuid',
    example: '72eb0d7d-f0a8-4a2b-9ea3-27c8792f4a21',
  })
  id: string;
  @ApiProperty({ example: 'Ana Souza' })
  name: string;
  @ApiProperty({ format: 'email', example: 'ana@example.com' })
  email: string;

  @ApiProperty({ enum: Role, example: Role.owner })
  @Transform(({ value }: { value: Role }) => value.toString().toLowerCase())
  role: Role;

  @ApiProperty({
    type: String,
    format: 'date-time',
    example: '2026-07-23T12:00:00.000Z',
  })
  @Transform(({ value }: { value: Date }) => value.toISOString())
  createdAt: Date;

  @ApiProperty({
    type: () => UserBarberShopContextPresenter,
    nullable: true,
  })
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
