import { ApiProperty } from '@nestjs/swagger';
import { ApiSuccessResponseDto } from '../../../common/dto/api-success-response.dto';

export class HealthDataDto {
  @ApiProperty({ example: 'ok', enum: ['ok', 'degraded'] })
  status!: 'ok' | 'degraded';

  @ApiProperty({ example: 'up', enum: ['up', 'down'] })
  database!: 'up' | 'down';

  @ApiProperty({ example: '2026-06-15T08:00:00.000Z' })
  timestamp!: string;
}

export class HealthResponseDto extends ApiSuccessResponseDto {
  @ApiProperty({ type: HealthDataDto })
  data!: HealthDataDto;
}
