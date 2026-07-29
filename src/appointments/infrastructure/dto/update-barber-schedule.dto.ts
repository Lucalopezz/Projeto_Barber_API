import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

class BarberScheduleWindowDto {
  @ApiProperty({
    description: 'Dia da semana, de 0 (domingo) a 6 (sábado).',
    example: 1,
    minimum: 0,
    maximum: 6,
  })
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek: number;

  @ApiProperty({
    description: 'Minutos desde 00:00 no fuso da barbearia.',
    example: 540,
    minimum: 0,
    maximum: 1439,
  })
  @IsInt()
  @Min(0)
  @Max(1439)
  startMinute: number;

  @ApiProperty({
    description: 'Fim exclusivo em minutos desde 00:00.',
    example: 720,
    minimum: 1,
    maximum: 1440,
  })
  @IsInt()
  @Min(1)
  @Max(1440)
  endMinute: number;
}

export class UpdateBarberScheduleDto {
  @ApiProperty({
    type: [BarberScheduleWindowDto],
    example: [
      { dayOfWeek: 1, startMinute: 540, endMinute: 720 },
      { dayOfWeek: 1, startMinute: 780, endMinute: 1080 },
    ],
  })
  @IsArray()
  @ArrayMaxSize(21)
  @ValidateNested({ each: true })
  @Type(() => BarberScheduleWindowDto)
  schedules: BarberScheduleWindowDto[];
}
