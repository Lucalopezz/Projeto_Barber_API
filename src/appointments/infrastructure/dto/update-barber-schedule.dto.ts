import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

class BarberScheduleWindowDto {
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek: number;

  @IsInt()
  @Min(0)
  @Max(1439)
  startMinute: number;

  @IsInt()
  @Min(1)
  @Max(1440)
  endMinute: number;
}

export class UpdateBarberScheduleDto {
  @IsArray()
  @ArrayMaxSize(21)
  @ValidateNested({ each: true })
  @Type(() => BarberScheduleWindowDto)
  schedules: BarberScheduleWindowDto[];
}
