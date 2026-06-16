import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, TransformFnParams } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

function toNumber({ value }: TransformFnParams): unknown {
  return Number(value);
}

function toBoolean({ value }: TransformFnParams): unknown {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return value;
}

export class FaqQueryDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @Transform(toNumber)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @Transform(toNumber)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number;

  @ApiPropertyOptional({
    description: 'Case-insensitive search in question and answer',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Case-insensitive category filter' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional()
  @Transform(toBoolean)
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
