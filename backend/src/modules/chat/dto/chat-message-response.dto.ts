import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ChatMessageResponseDto {
  @ApiProperty({ example: '019b9d80-7a2e-7b4b-8dc1-7a44b6300200' })
  id!: string;

  @ApiProperty({ example: 'customer' })
  role!: string;

  @ApiProperty({ example: 'Halo, ada menu apa hari ini?' })
  message!: string;

  @ApiProperty({ example: '2026-06-15T12:00:00.000Z' })
  createdAt!: string;

  @ApiPropertyOptional({
    example: '019b9d80-7a2e-7b4b-8dc1-7a44b6300201',
  })
  clientMessageId?: string;

  @ApiPropertyOptional({
    example: '019b9d80-7a2e-7b4b-8dc1-7a44b6300202',
  })
  replyToMessageId?: string;

  @ApiPropertyOptional({ example: 'completed' })
  processingStatus?: string;
}
