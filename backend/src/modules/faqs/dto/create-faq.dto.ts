import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, TransformFnParams } from 'class-transformer';
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

function trimAndNull({ value }: TransformFnParams): unknown {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed || null;
}

function trimString({ value }: TransformFnParams): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

export class CreateFaqDto {
  @ApiProperty({
    example: 'Apakah bisa pesan untuk acara?',
  })
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  question!: string;

  @ApiProperty({
    example: 'Bisa. Hubungi WhatsApp minimal dua hari sebelum acara.',
  })
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  answer!: string;

  @ApiPropertyOptional({ example: 'Pemesanan', maxLength: 100, nullable: true })
  @Transform(trimAndNull)
  @IsString()
  @MaxLength(100)
  @IsOptional()
  category?: string | null;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
