import { IsDate, IsOptional, IsString, MaxLength } from 'class-validator';
import { ToUtcDate } from './utc-date.transform';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBarberTimeOffDto {
  @ApiProperty({
    type: String,
    format: 'date-time',
    example: '2026-08-01T12:00:00.000Z',
  })
  @IsDate()
  @ToUtcDate()
  startsAt: Date;

  @ApiProperty({
    type: String,
    format: 'date-time',
    example: '2026-08-01T15:00:00.000Z',
  })
  @IsDate()
  @ToUtcDate()
  endsAt: Date;

  @ApiPropertyOptional({ example: 'Folga' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  reason?: string;
}
