import { Type } from 'class-transformer';
import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AssistantInput } from '../../application/ports/assistant';
export class AssistantContextDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  barberShopId?: string;
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  serviceId?: string;
  @ApiPropertyOptional({ example: '2026-12-01' })
  @IsOptional()
  @IsDateString({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  date?: string;
}
export class ChatDto implements AssistantInput {
  @ApiProperty({ maxLength: 1000 })
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/)
  @MaxLength(1000)
  message: string;
  @ApiPropertyOptional({ type: AssistantContextDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => AssistantContextDto)
  context?: AssistantContextDto;
}
