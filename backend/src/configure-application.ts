import {
  INestApplication,
  UnprocessableEntityException,
  ValidationPipe,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import express from 'express';
import { flattenValidationErrors } from './common/validation/flatten-validation-errors';
import { applyCorrelationId } from './common/middleware/correlation-id.middleware';
import { applySecurityHeaders } from './common/middleware/security-headers.middleware';
import { parseFrontendOrigins } from './config/frontend-origins';

export function configureApplication(
  app: INestApplication,
  config: ConfigService,
): void {
  app.setGlobalPrefix('api');
  app.enableShutdownHooks();
  app.use(applyCorrelationId, applySecurityHeaders);
  app.enableCors({
    credentials: true,
    methods: ['GET', 'HEAD', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    origin: parseFrontendOrigins(config.getOrThrow<string>('FRONTEND_URL')),
  });
  app.use(
    express.json({ limit: '1mb' }),
    express.urlencoded({ extended: true, limit: '1mb' }),
  );
  app.useGlobalPipes(
    new ValidationPipe({
      forbidNonWhitelisted: true,
      transform: true,
      whitelist: true,
      exceptionFactory: (errors) =>
        new UnprocessableEntityException({
          message: 'Validation failed',
          errors: flattenValidationErrors(errors),
        }),
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('AI Sales Assistant for UMKM API')
    .setDescription(
      'Backend API for public sales chat, lead capture, WhatsApp handoff, and the authenticated UMKM dashboard.',
    )
    .setVersion('0.1.0')
    .addBearerAuth()
    .addApiKey(
      { type: 'apiKey', in: 'header', name: 'X-Chat-Session-Token' },
      'chat-session-token',
    )
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    jsonDocumentUrl: 'api/docs-json',
    swaggerOptions: { persistAuthorization: false },
  });
}
