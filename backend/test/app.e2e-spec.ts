import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { ConfigService } from '@nestjs/config';
import { configureApplication } from '../src/configure-application';
import { DatabaseService } from '../src/database/database.service';

describe('Health API (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(DatabaseService)
      .useValue({ ping: () => Promise.resolve(true) })
      .compile();

    app = moduleFixture.createNestApplication({ bodyParser: false });
    configureApplication(app, app.get(ConfigService));
    await app.init();
  });

  it('GET /api/health', () => {
    return request(app.getHttpServer())
      .get('/api/health')
      .expect(200)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          success: true,
          message: 'Service is healthy',
          data: { status: 'ok', database: 'up' },
        });
      });
  });

  it('GET /api/docs-json exposes the health contract', () => {
    return request(app.getHttpServer())
      .get('/api/docs-json')
      .expect(200)
      .expect(({ body }) => {
        const serialized = JSON.stringify(body);
        expect(body).toMatchObject({
          info: { title: 'AI Sales Assistant for UMKM API' },
          components: {
            securitySchemes: {
              bearer: { type: 'http', scheme: 'bearer' },
              'chat-session-token': {
                type: 'apiKey',
                in: 'header',
                name: 'X-Chat-Session-Token',
              },
            },
          },
        });
        expect(serialized).toContain('"/api/health"');
        expect(serialized).toContain('"/api/business-profile"');
        expect(serialized).toContain('"/api/public/businesses/{businessSlug}"');
        expect(serialized).toContain('"/api/products"');
        expect(serialized).toContain('"/api/products/{id}"');
        expect(serialized).toContain('"/api/faqs"');
        expect(serialized).toContain('"/api/faqs/{id}"');
        expect(serialized).toContain(
          '"/api/public/businesses/{businessSlug}/chat/sessions"',
        );
        expect(serialized).toContain(
          '"/api/public/businesses/{businessSlug}/chat/sessions/{sessionId}/messages"',
        );
        expect(serialized).toContain('"/api/public/businesses/{businessSlug}/whatsapp/link"');
        expect(serialized).toContain(
          '"/api/public/businesses/{businessSlug}/whatsapp-clicks"',
        );
      });
  });

  afterEach(async () => {
    await app.close();
  });
});
