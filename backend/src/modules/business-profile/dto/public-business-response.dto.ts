import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ApiSuccessResponseDto } from '../../../common/dto/api-success-response.dto';

export class PublicBusinessResponseDto {
  @ApiProperty()
  slug!: string;

  @ApiProperty()
  businessName!: string;

  @ApiPropertyOptional({ nullable: true })
  description!: string | null;

  @ApiPropertyOptional({ nullable: true })
  category!: string | null;

  @ApiPropertyOptional({ nullable: true })
  location!: string | null;

  @ApiPropertyOptional({ nullable: true })
  operatingHours!: string | null;

  @ApiPropertyOptional({ nullable: true })
  mainOffer!: string | null;

  @ApiPropertyOptional({ nullable: true })
  ctaMessage!: string | null;

  @ApiProperty({ type: [String], maxItems: 3 })
  suggestedQuestions!: string[];
}

export class PublicBusinessEnvelopeDto extends ApiSuccessResponseDto {
  @ApiProperty({ type: PublicBusinessResponseDto })
  data!: PublicBusinessResponseDto;
}
