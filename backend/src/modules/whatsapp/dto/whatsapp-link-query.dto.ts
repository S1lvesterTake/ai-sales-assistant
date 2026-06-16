import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

export class WhatsappLinkQueryDto {
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
