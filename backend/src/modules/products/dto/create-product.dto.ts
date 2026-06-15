import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, TransformFnParams } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

function trimAndNull({ value }: TransformFnParams): unknown {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed || null;
}

function trimString({ value }: TransformFnParams): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

export class CreateProductDto {
  @ApiProperty({
    example: 'Kopi Susu Gula Aren',
    maxLength: 150,
  })
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name!: string;

  @ApiPropertyOptional({
    example: 'Espresso, susu segar, dan gula aren.',
    nullable: true,
  })
  @Transform(trimAndNull)
  @IsString()
  @IsOptional()
  description?: string | null;

  @ApiProperty({ example: 18_000, minimum: 0 })
  @IsInt()
  @Min(0)
  price!: number;

  @ApiPropertyOptional({ example: 'Kopi', maxLength: 100, nullable: true })
  @Transform(trimAndNull)
  @IsString()
  @MaxLength(100)
  @IsOptional()
  category?: string | null;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;

  @ApiPropertyOptional({
    example: 'Tersedia panas atau dingin.',
    nullable: true,
  })
  @Transform(trimAndNull)
  @IsString()
  @IsOptional()
  orderingInstruction?: string | null;

  @ApiPropertyOptional({
    example: 'Tingkat gula dapat disesuaikan.',
    nullable: true,
  })
  @Transform(trimAndNull)
  @IsString()
  @IsOptional()
  additionalNotes?: string | null;
}
