import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export interface ChatReplyResponse {
  clientMessageId: string;
  processingStatus: 'completed' | 'pending';
  message?: string;
  shouldShowWhatsappCta?: boolean;
  isBuyingIntentDetected?: boolean;
  shouldCaptureLead?: boolean;
  whatsappUrl?: string | null;
  detectedProduct?: string | null;
}

export class ChatReplyResponseDto {
  @ApiProperty({ example: '019b9d80-7a2e-7b4b-8dc1-7a44b63001c1' })
  clientMessageId!: string;

  @ApiProperty({ example: 'completed' })
  processingStatus!: string;

  @ApiPropertyOptional({
    example: 'Halo Kak! Harga Kopi Susu Gula Aren adalah Rp18.000.',
  })
  message?: string;

  @ApiPropertyOptional({ example: true })
  shouldShowWhatsappCta?: boolean;

  @ApiPropertyOptional({ example: true })
  isBuyingIntentDetected?: boolean;

  @ApiPropertyOptional({ example: true })
  shouldCaptureLead?: boolean;

  @ApiPropertyOptional({
    example: 'https://wa.me/6281234567890',
  })
  whatsappUrl?: string | null;

  @ApiPropertyOptional({ example: 'Kopi Susu Gula Aren' })
  detectedProduct?: string | null;
}

export class ChatReplyEnvelopeDto {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty({ example: 'Message processed successfully' })
  message!: string;

  @ApiProperty({ type: ChatReplyResponseDto })
  data!: ChatReplyResponseDto;
}
