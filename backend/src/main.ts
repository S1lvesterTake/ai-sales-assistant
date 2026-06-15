import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { readBootstrapEnvironment } from './config/bootstrap-env';

async function bootstrap() {
  const environment = readBootstrapEnvironment(process.env);
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.enableShutdownHooks();
  await app.listen(environment.port, '0.0.0.0');
}

void bootstrap();
