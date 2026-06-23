import { randomUUID } from 'node:crypto';
import type { IncomingMessage } from 'node:http';
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { RequestLoggingMiddleware } from './common/middleware/request-logging.middleware';
import { validateEnvironment } from './config/environment.validation';
import { DatabaseModule } from './database/database.module';
import { DemoDataModule } from './database/seeds/demo-data.module';
import { ErrorLogService } from './modules/error-log/error-log.service';
import { AuthModule } from './modules/auth/auth.module';
import { BusinessProfileModule } from './modules/business-profile/business-profile.module';
import { ChatModule } from './modules/chat/chat.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { FaqsModule } from './modules/faqs/faqs.module';
import { LeadsModule } from './modules/leads/leads.module';
import { HealthModule } from './modules/health/health.module';
import { OwnershipModule } from './common/ownership/ownership.module';
import { ProductsModule } from './modules/products/products.module';
import { WhatsappModule } from './modules/whatsapp/whatsapp.module';

const correlationIdPattern = /^[A-Za-z0-9._:-]{1,128}$/;

@Module({
  imports: [
    ConfigModule.forRoot({
      cache: true,
      isGlobal: true,
      validate: validateEnvironment,
    }),
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const isPinoPretty = config.get<string>('PINO_PRETTY') === 'true';
        return {
          pinoHttp: {
            autoLogging: false,
            genReqId: (req: IncomingMessage) => {
              const r = req as IncomingMessage & { correlationId?: string };
              if (r.correlationId) return r.correlationId;
              const h = req.headers['x-correlation-id'];
              const raw = Array.isArray(h) ? h[0] : h;
              return raw && correlationIdPattern.test(raw) ? raw : randomUUID();
            },
            level:
              config.get<string>('NODE_ENV') === 'production'
                ? 'info'
                : 'debug',
            ...(isPinoPretty
              ? {
                  transport: {
                    target: 'pino-pretty',
                    options: { singleLine: true },
                  },
                }
              : {}),
          },
        };
      },
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
    DemoDataModule,
    OwnershipModule,
    AuthModule,
    BusinessProfileModule,
    ChatModule,
    DashboardModule,
    FaqsModule,
    LeadsModule,
    ProductsModule,
    WhatsappModule,
    HealthModule,
  ],
  providers: [
    ErrorLogService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
  ],
  exports: [ErrorLogService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestLoggingMiddleware).forRoutes('*');
  }
}
