import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ApiSuccessResponseDto } from '../../../common/dto/api-success-response.dto';

export class BusinessProfileResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  businessName!: string;

  @ApiProperty()
  slug!: string;

  @ApiPropertyOptional({ nullable: true })
  description!: string | null;

  @ApiPropertyOptional({ nullable: true })
  category!: string | null;

  @ApiProperty()
  whatsappNumber!: string;

  @ApiPropertyOptional({ nullable: true })
  location!: string | null;

  @ApiPropertyOptional({ nullable: true })
  operatingHours!: string | null;

  @ApiPropertyOptional({ nullable: true })
  mainOffer!: string | null;

  @ApiPropertyOptional({ nullable: true })
  ctaMessage!: string | null;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: string;
}

export class BusinessProfileEnvelopeDto extends ApiSuccessResponseDto {
  @ApiProperty({ type: BusinessProfileResponseDto })
  data!: BusinessProfileResponseDto;
}
