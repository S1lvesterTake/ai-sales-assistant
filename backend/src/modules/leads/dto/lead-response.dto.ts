import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LeadResponseDto {
  @ApiProperty({ example: '019b9d80-7a2e-7b4b-8dc1-7a44b6300200' })
  id!: string;

  @ApiPropertyOptional({ example: 'Budi' })
  name?: string | null;

  @ApiProperty({ example: '6281234567890' })
  phone!: string;

  @ApiPropertyOptional({ example: 'Tertarik dengan Kopi Susu Gula Aren' })
  interestSummary?: string | null;

  @ApiProperty({ example: 'new' })
  status!: string;

  @ApiPropertyOptional({ example: 'chatbot' })
  source?: string | null;

  @ApiPropertyOptional({ example: '019b9d80-7a2e-7b4b-8dc1-7a44b6300100' })
  chatSessionId?: string | null;

  @ApiProperty({ example: '2026-06-15T14:00:00.000Z' })
  createdAt!: string;

  @ApiProperty({ example: '2026-06-15T14:00:00.000Z' })
  updatedAt!: string;
}

export class LeadEnvelopeDto {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty({ example: 'Lead created successfully' })
  message!: string;

  @ApiProperty({ type: LeadResponseDto })
  data!: LeadResponseDto;
}
