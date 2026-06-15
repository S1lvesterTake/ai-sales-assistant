import { Body, Controller, INestApplication, Post } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { Throttle } from '@nestjs/throttler';
import { IsString, MaxLength, MinLength } from 'class-validator';
import request from 'supertest';
import { App } from 'supertest/types';
import { ResponseMessage } from '../src/common/decorators/response-message.decorator';
import { configureApplication } from '../src/configure-application';
import { AppModule } from '../src/app.module';

class EchoDto {
  @IsString()
  @MinLength(2)
  @MaxLength(20)
  value!: string;
}

@Controller('_test')
class TransportTestController {
  @Post('echo')
  @ResponseMessage('Echo accepted')
  echo(@Body() input: EchoDto): EchoDto {
    return input;
  }

  @Post('limited')
  @Throttle({ default: { limit: 2, ttl: 60_000 } })
  limited(): { accepted: true } {
    return { accepted: true };
  }
}

describe('HTTP foundation (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    process.env.FRONTEND_URL = 'http://localhost:3000';
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
      controllers: [TransportTestController],
    }).compile();

    app = moduleFixture.createNestApplication({ bodyParser: false });
    configureApplication(app, app.get(ConfigService));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('wraps successful responses and preserves correlation IDs', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/_test/echo')
      .set('X-Correlation-ID', 'request-123')
      .send({ value: 'halo' })
      .expect(201);

    expect(response.headers['x-correlation-id']).toBe('request-123');
    expect(response.body).toEqual({
      success: true,
      message: 'Echo accepted',
      data: { value: 'halo' },
    });
  });

  it('returns field errors and rejects unknown properties', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/_test/echo')
      .send({ value: '', password: 'must-not-be-logged' })
      .expect(422);

    expect(response.body).toMatchObject({
      success: false,
      message: 'Validation failed',
      code: 'VALIDATION_ERROR',
    });
    const serialized = JSON.stringify(response.body);
    expect(serialized).toContain('"field":"value"');
    expect(serialized).toContain('"field":"password"');
  });

  it('sanitizes malformed JSON errors', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/_test/echo')
      .set('X-Correlation-ID', 'malformed-json-123')
      .set('Content-Type', 'application/json')
      .send('{invalid')
      .expect(400);

    expect(response.body).toEqual({
      success: false,
      message: 'Invalid request body',
      code: 'BAD_REQUEST',
    });
    expect(response.headers['x-correlation-id']).toBe('malformed-json-123');
  });

  it('sets CORS and baseline security headers', async () => {
    const preflight = await request(app.getHttpServer())
      .options('/api/_test/echo')
      .set('Origin', 'http://localhost:3000')
      .set('Access-Control-Request-Method', 'POST')
      .expect(204);

    expect(preflight.headers['access-control-allow-origin']).toBe(
      'http://localhost:3000',
    );

    const response = await request(app.getHttpServer())
      .post('/api/_test/echo')
      .send({ value: 'aman' })
      .expect(201);
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['x-frame-options']).toBe('DENY');
    expect(response.headers['referrer-policy']).toBe('no-referrer');
  });

  it('returns the canonical envelope when a route is throttled', async () => {
    await request(app.getHttpServer()).post('/api/_test/limited').expect(201);
    await request(app.getHttpServer()).post('/api/_test/limited').expect(201);
    const response = await request(app.getHttpServer())
      .post('/api/_test/limited')
      .expect(429);

    expect(response.body).toEqual({
      success: false,
      message: 'Too many requests',
      code: 'RATE_LIMITED',
    });
  });
});
