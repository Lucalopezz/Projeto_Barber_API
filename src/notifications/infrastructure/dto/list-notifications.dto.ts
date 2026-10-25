import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ListNotificationsUseCase } from '../../application/usecases/list-notifications.usecase';

export class ListNotificationsDto implements Omit<
  ListNotificationsUseCase.Input,
  'userId'
> {
  @ApiPropertyOptional({ minimum: 1, default: 1, type: Number })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 15, type: Number })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  perPage?: number;
}
