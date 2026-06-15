import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class DashboardSummaryDto {
  @ApiProperty({ example: 42 })
  totalLeads!: number;

  @ApiProperty({ example: 12 })
  newLeads!: number;

  @ApiProperty({ example: 156 })
  totalChatSessions!: number;

  @ApiProperty({ example: 89 })
  whatsappClicks!: number;
}

export class RecentLeadDto {
  @ApiProperty({ example: '019b9d80-7a2e-7b4b-8dc1-7a44b6300200' })
  id!: string;

  @ApiPropertyOptional({ example: 'Budi' })
  name?: string | null;

  @ApiProperty({ example: '6281234567890' })
  phone!: string;

  @ApiProperty({ example: 'new' })
  status!: string;

  @ApiProperty({ example: '2026-06-15T14:00:00.000Z' })
  createdAt!: string;
}

export class RecentConversationDto {
  @ApiProperty({ example: '019b9d80-7a2e-7b4b-8dc1-7a44b6300100' })
  sessionId!: string;

  @ApiPropertyOptional({ example: 'Budi' })
  customerName?: string | null;

  @ApiProperty({ example: 'Halo, ada menu apa hari ini?' })
  lastMessage!: string;

  @ApiProperty({ example: '2026-06-15T14:00:00.000Z' })
  lastMessageAt!: string;
}

export class TopQuestionDto {
  @ApiProperty({ example: 'Apakah bisa pesan untuk acara?' })
  question!: string;

  @ApiProperty({ example: 15 })
  count!: number;
}

export class DashboardSummaryEnvelopeDto {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty({ example: 'Dashboard summary retrieved' })
  message!: string;

  @ApiProperty({ type: DashboardSummaryDto })
  data!: DashboardSummaryDto;
}
