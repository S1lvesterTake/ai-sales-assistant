import { ApiProperty } from '@nestjs/swagger';

export class ChatSessionResponseDto {
  @ApiProperty({ example: '019b9d80-7a2e-7b4b-8dc1-7a44b6300100' })
  sessionId!: string;

  @ApiProperty({
    example: 'dGhpcyBpcyBhIHJhbmRvbSB0b2tlbiBleGFtcGxl',
    description: 'Raw session token — returned only once at creation',
  })
  sessionToken!: string;

  @ApiProperty({ example: '2026-06-16T12:00:00.000Z' })
  expiresAt!: string;
}

export class ChatSessionEnvelopeDto {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty({ example: 'Chat session created successfully' })
  message!: string;

  @ApiProperty({ type: ChatSessionResponseDto })
  data!: ChatSessionResponseDto;
}
