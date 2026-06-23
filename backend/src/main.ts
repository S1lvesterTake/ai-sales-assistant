import { initSentry } from './instrument';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { Logger } from 'nestjs-pino';
import { configureApplication } from './configure-application';

async function bootstrap() {
  initSentry();
  const app = await NestFactory.create(AppModule, {
    bodyParser: false,
    bufferLogs: true,
  });
  const config = app.get(ConfigService);
  app.useLogger(app.get(Logger));
  configureApplication(app, config);
  await app.listen(config.getOrThrow<number>('PORT'), '0.0.0.0');
}

void bootstrap();
