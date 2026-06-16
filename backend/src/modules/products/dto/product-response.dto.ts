import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ProductResponseDto {
  @ApiProperty({ example: '019b9d80-7a2e-7b4b-8dc1-7a44b6300010' })
  id!: string;

  @ApiProperty({ example: 'Kopi Susu Gula Aren' })
  name!: string;

  @ApiPropertyOptional({ example: 'Espresso, susu segar, dan gula aren.' })
  description?: string | null;

  @ApiProperty({ example: 18_000 })
  price!: number;

  @ApiPropertyOptional({ example: 'Kopi' })
  category?: string | null;

  @ApiProperty({ example: true })
  isAvailable!: boolean;

  @ApiPropertyOptional({ example: 'Tersedia panas atau dingin.' })
  orderingInstruction?: string | null;

  @ApiPropertyOptional({ example: 'Tingkat gula dapat disesuaikan.' })
  additionalNotes?: string | null;

  @ApiProperty({ example: '2026-06-15T08:00:00.000Z' })
  createdAt!: string;

  @ApiProperty({ example: '2026-06-15T08:00:00.000Z' })
  updatedAt!: string;
}

export class ProductEnvelopeDto {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty({ example: 'Product created successfully' })
  message!: string;

  @ApiProperty({ type: ProductResponseDto })
  data!: ProductResponseDto;
}
