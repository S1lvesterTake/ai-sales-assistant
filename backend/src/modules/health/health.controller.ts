import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { DatabaseService } from '../../database/database.service';
import { HealthDataDto, HealthResponseDto } from './dto/health-response.dto';

@ApiTags('Health Check')
@Controller('health')
export class HealthController {
  constructor(private readonly database: DatabaseService) {}

  @Get()
  @ResponseMessage('Service is healthy')
  @ApiOkResponse({ type: HealthResponseDto })
  async getHealth(): Promise<HealthDataDto> {
    let database: HealthDataDto['database'] = 'down';
    try {
      database = (await this.database.ping()) ? 'up' : 'down';
    } catch {
      database = 'down';
    }
    return {
      status: database === 'up' ? 'ok' : 'degraded',
      database,
      timestamp: new Date().toISOString(),
    };
  }
}
