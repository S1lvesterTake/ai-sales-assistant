import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ApiFieldErrorDto } from './api-field-error.dto';

export class ApiErrorResponseDto {
  @ApiProperty({ example: false })
  success!: false;

  @ApiProperty({ example: 'Validation failed' })
  message!: string;

  @ApiPropertyOptional({ example: 'VALIDATION_ERROR' })
  code?: string;

  @ApiPropertyOptional({ type: [ApiFieldErrorDto] })
  errors?: ApiFieldErrorDto[];
}
