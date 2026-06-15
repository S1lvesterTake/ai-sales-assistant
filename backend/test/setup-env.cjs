process.env.NODE_ENV = 'test';
process.env.DATABASE_URL ??=
  'postgresql://postgres:postgres@127.0.0.1:5432/ai_sales_assistant_test';
process.env.JWT_SECRET ??= 'test-jwt-secret-with-at-least-32-characters';
process.env.JWT_EXPIRES_IN ??= '3600';
process.env.CHAT_SESSION_TTL ??= '86400';
process.env.CHAT_SESSION_CREATE_LIMIT ??= '10';
process.env.CHAT_MESSAGE_LIMIT ??= '20';
process.env.DEMO_USER_PASSWORD ??= 'DemoKopiSenja2026!';
process.env.DEMO_DATA_RESET_ON_DEPLOY ??= 'false';
