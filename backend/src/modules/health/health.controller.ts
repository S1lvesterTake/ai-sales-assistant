import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { HealthDataDto, HealthResponseDto } from './dto/health-response.dto';

@ApiTags('Health Check')
@Controller('health')
export class HealthController {
  @Get()
  @ResponseMessage('Service is healthy')
  @ApiOkResponse({ type: HealthResponseDto })
  getHealth(): HealthDataDto {
    return {
      status: 'ok',
      database: 'not_configured',
      timestamp: new Date().toISOString(),
    };
  }
}
