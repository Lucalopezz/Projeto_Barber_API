import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class NotificationIdDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  id: string;
}
