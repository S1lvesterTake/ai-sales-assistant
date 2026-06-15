import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, TransformFnParams } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

function toNumber({ value }: TransformFnParams): unknown {
  return Number(value);
}

export class LeadQueryDto {
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

  @ApiPropertyOptional({ description: 'Search in name and phone' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    enum: ['new', 'contacted', 'qualified', 'closed', 'lost'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['new', 'contacted', 'qualified', 'closed', 'lost'])
  status?: string;
}
