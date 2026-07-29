import { SortDirection } from '@/shared/domain/repositories/searchable.repository';
import { ListUsersUseCase } from '@/users/application/usecases/list-users.usecase';
import { Role } from '@/users/domain/entities/role.enum';
import { Transform } from 'class-transformer';
import { IsEnum, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ListUsersDto implements ListUsersUseCase.Input {
  @ApiPropertyOptional({ example: 1, minimum: 1, type: Number })
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ example: 15, minimum: 1, type: Number })
  @IsOptional()
  perPage?: number;

  @ApiPropertyOptional({ example: 'createdAt' })
  @IsOptional()
  sort?: string;

  @ApiPropertyOptional({ enum: ['asc', 'desc'], example: 'desc' })
  @IsOptional()
  sortDir?: SortDirection;

  @ApiPropertyOptional({ example: 'Ana' })
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ enum: Role, example: Role.client })
  @IsOptional()
  @IsEnum(Role)
  @Transform(({ value }) => (value !== undefined ? value.toLowerCase() : value))
  role?: Role;
}
