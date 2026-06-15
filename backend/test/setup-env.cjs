process.env.NODE_ENV = 'test';
process.env.DATABASE_URL ??=
  'postgresql://postgres:postgres@127.0.0.1:5432/ai_sales_assistant_test';
