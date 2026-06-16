import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, TransformFnParams } from 'class-transformer';
import { IsOptional, IsString, MaxLength } from 'class-validator';

function trimAndNull({ value }: TransformFnParams): unknown {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed || null;
}

export class CreateChatSessionDto {
  @ApiPropertyOptional({
    example: 'Budi',
    maxLength: 100,
    nullable: true,
  })
  @Transform(trimAndNull)
  @IsString()
  @MaxLength(100)
  @IsOptional()
  customerName?: string | null;

  @ApiPropertyOptional({
    example: '081234567890',
    maxLength: 30,
    nullable: true,
  })
  @Transform(trimAndNull)
  @IsString()
  @MaxLength(30)
  @IsOptional()
  customerPhone?: string | null;

  @ApiPropertyOptional({
    example: 'landing-page',
    maxLength: 50,
    nullable: true,
  })
  @Transform(trimAndNull)
  @IsString()
  @MaxLength(50)
  @IsOptional()
  source?: string | null;
}
