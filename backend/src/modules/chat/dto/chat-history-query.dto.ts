import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, TransformFnParams } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

function toNumber({ value }: TransformFnParams): unknown {
  return Number(value);
}

export class ChatHistoryQueryDto {
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
}
