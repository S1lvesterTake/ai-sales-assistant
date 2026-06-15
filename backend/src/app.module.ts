import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { StructuredLogger } from './common/logging/structured-logger.service';
import { RequestLoggingMiddleware } from './common/middleware/request-logging.middleware';
import { validateEnvironment } from './config/environment.validation';
import { DatabaseModule } from './database/database.module';
import { ErrorLogService } from './modules/error-log/error-log.service';
import { HealthModule } from './modules/health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      cache: true,
      isGlobal: true,
      validate: validateEnvironment,
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          limit: config.getOrThrow<number>('RATE_LIMIT_LIMIT'),
          ttl: config.getOrThrow<number>('RATE_LIMIT_TTL_MS'),
        },
      ],
    }),
    DatabaseModule,
    HealthModule,
  ],
  providers: [
    StructuredLogger,
    ErrorLogService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
  ],
  exports: [StructuredLogger, ErrorLogService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestLoggingMiddleware).forRoutes('*');
  }
}
