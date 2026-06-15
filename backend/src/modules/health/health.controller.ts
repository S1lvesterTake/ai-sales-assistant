import { Controller, Get } from '@nestjs/common';

export interface HealthResponse {
  success: true;
  message: string;
  data: {
    status: 'ok';
    database: 'not_configured';
    timestamp: string;
  };
}

@Controller('health')
export class HealthController {
  @Get()
  getHealth(): HealthResponse {
    return {
      success: true,
      message: 'Service is healthy',
      data: {
        status: 'ok',
        database: 'not_configured',
        timestamp: new Date().toISOString(),
      },
    };
  }
}
