import { ApiProperty } from '@nestjs/swagger';
import { ApiSuccessResponseDto } from '../../../common/dto/api-success-response.dto';

export class HealthDataDto {
  @ApiProperty({ example: 'ok' })
  status!: 'ok';

  @ApiProperty({ example: 'not_configured' })
  database!: 'not_configured';

  @ApiProperty({ example: '2026-06-15T08:00:00.000Z' })
  timestamp!: string;
}

export class HealthResponseDto extends ApiSuccessResponseDto {
  @ApiProperty({ type: HealthDataDto })
  data!: HealthDataDto;
}
