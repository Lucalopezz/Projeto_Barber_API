import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';
export class RefreshSessionDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  sessionId?: string;
}
export class LogoutSessionDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  sessionId: string;
}
