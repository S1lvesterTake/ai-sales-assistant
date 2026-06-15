import { ApiProperty } from '@nestjs/swagger';

export class WhatsappLinkResponseDto {
  @ApiProperty({ example: 'https://wa.me/6281234567890' })
  url!: string;
}

export class WhatsappLinkEnvelopeDto {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty({ example: 'WhatsApp link generated successfully' })
  message!: string;

  @ApiProperty({ type: WhatsappLinkResponseDto })
  data!: WhatsappLinkResponseDto;
}
