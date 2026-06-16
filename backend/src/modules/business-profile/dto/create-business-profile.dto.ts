import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, TransformFnParams } from 'class-transformer';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { IsIndonesianPhone } from '../../../common/validation/is-indonesian-phone.decorator';

function trimString({ value }: TransformFnParams): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

export class CreateBusinessProfileDto {
  @ApiProperty({ example: 'Kopi Senja UMKM', maxLength: 150 })
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  businessName!: string;

  @ApiProperty({ example: 'kopi-senja-umkm', maxLength: 100 })
  @Transform(trimString)
  @IsString()
  @MaxLength(100)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  slug!: string;

  @ApiPropertyOptional({ maxLength: 1000, nullable: true })
  @Transform(trimString)
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string | null;

  @ApiPropertyOptional({ maxLength: 100, nullable: true })
  @Transform(trimString)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string | null;

  @ApiProperty({ example: '+62 812-3456-7890', maxLength: 30 })
  @Transform(trimString)
  @IsString()
  @MaxLength(30)
  @IsIndonesianPhone()
  whatsappNumber!: string;

  @ApiPropertyOptional({ maxLength: 1000, nullable: true })
  @Transform(trimString)
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  location?: string | null;

  @ApiPropertyOptional({ maxLength: 255, nullable: true })
  @Transform(trimString)
  @IsOptional()
  @IsString()
  @MaxLength(255)
  operatingHours?: string | null;

  @ApiPropertyOptional({ maxLength: 1000, nullable: true })
  @Transform(trimString)
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  mainOffer?: string | null;

  @ApiPropertyOptional({ maxLength: 300, nullable: true })
  @Transform(trimString)
  @IsOptional()
  @IsString()
  @MaxLength(300)
  ctaMessage?: string | null;
}
