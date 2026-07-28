import { IsDate, IsOptional, IsString, MaxLength } from 'class-validator';
import { ToUtcDate } from './utc-date.transform';

export class CreateBarberTimeOffDto {
  @IsDate()
  @ToUtcDate()
  startsAt: Date;

  @IsDate()
  @ToUtcDate()
  endsAt: Date;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  reason?: string;
}
