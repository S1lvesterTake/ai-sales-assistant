import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

export class TrackWhatsappClickInput {
  @ApiPropertyOptional({
    example: '019b9d80-7a2e-7b4b-8dc1-7a44b6300100',
    description: 'Optional chat session context',
  })
  @IsUUID()
  @IsOptional()
  sessionId?: string;

  @ApiPropertyOptional({
    example: '019b9d80-7a2e-7b4b-8dc1-7a44b6300200',
    description: 'Optional lead context',
  })
  @IsUUID()
  @IsOptional()
  leadId?: string;
}

export class WhatsappClickResponseDto {
  @ApiProperty({ example: '019b9d80-7a2e-7b4b-8dc1-7a44b6300300' })
  id!: string;

  @ApiProperty({ example: '2026-06-15T14:00:00.000Z' })
  clickedAt!: string;
}

export class WhatsappClickEnvelopeDto {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty({ example: 'WhatsApp click recorded successfully' })
  message!: string;

  @ApiProperty({ type: WhatsappClickResponseDto })
  data!: WhatsappClickResponseDto;
}
