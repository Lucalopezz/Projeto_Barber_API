import { SortDirection } from '@/shared/domain/repositories/searchable.repository';
import { ListUsersUseCase } from '@/users/application/usecases/list-users.usecase';
import { Role } from '@/users/domain/entities/role.enum';
import { Transform } from 'class-transformer';
import { IsEnum, IsOptional } from 'class-validator';

export class ListUsersDto implements ListUsersUseCase.Input {
  @IsOptional()
  page?: number;

  @IsOptional()
  perPage?: number;

  @IsOptional()
  sort?: string;

  @IsOptional()
  sortDir?: SortDirection;

  @IsOptional()
  name?: string;

  @IsOptional()
  @IsEnum(Role)
  @Transform(({ value }) => (value !== undefined ? value.toLowerCase() : value))
  role?: Role;
}
