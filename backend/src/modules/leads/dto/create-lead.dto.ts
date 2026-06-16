import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, TransformFnParams } from 'class-transformer';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

function trimString({ value }: TransformFnParams): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

function trimAndNull({ value }: TransformFnParams): unknown {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed || null;
}

export class CreateLeadDto {
  @ApiPropertyOptional({ example: 'Budi', maxLength: 100 })
  @Transform(trimAndNull)
  @IsString()
  @MaxLength(100)
  @IsOptional()
  name?: string | null;

  @ApiProperty({ example: '081234567890', maxLength: 30 })
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  phone!: string;

  @ApiPropertyOptional({
    example: 'Tertarik dengan Kopi Susu Gula Aren',
  })
  @Transform(trimAndNull)
  @IsString()
  @IsOptional()
  interestSummary?: string | null;

  @ApiPropertyOptional({
    example: '019b9d80-7a2e-7b4b-8dc1-7a44b6300100',
    description: 'Required when using chat-session-token auth',
  })
  @IsUUID()
  @IsOptional()
  chatSessionId?: string;
}
