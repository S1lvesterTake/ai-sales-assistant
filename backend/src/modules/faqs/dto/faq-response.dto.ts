import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class FaqResponseDto {
  @ApiProperty({ example: '019b9d80-7a2e-7b4b-8dc1-7a44b6300020' })
  id!: string;

  @ApiProperty({ example: 'Apakah bisa pesan untuk acara?' })
  question!: string;

  @ApiProperty({
    example: 'Bisa. Hubungi WhatsApp minimal dua hari sebelum acara.',
  })
  answer!: string;

  @ApiPropertyOptional({ example: 'Pemesanan' })
  category?: string | null;

  @ApiProperty({ example: true })
  isActive!: boolean;

  @ApiProperty({ example: '2026-06-15T08:00:00.000Z' })
  createdAt!: string;

  @ApiProperty({ example: '2026-06-15T08:00:00.000Z' })
  updatedAt!: string;
}

export class FaqEnvelopeDto {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty({ example: 'FAQ created successfully' })
  message!: string;

  @ApiProperty({ type: FaqResponseDto })
  data!: FaqResponseDto;
}
