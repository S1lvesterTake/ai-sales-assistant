import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  out: './src/database/migrations',
  schema: './src/database/schema/index.ts',
  dbCredentials: {
    url:
      process.env.DATABASE_URL ??
      'postgresql://postgres:postgres@localhost:5432/ai_sales_assistant',
  },
  strict: true,
  verbose: true,
});
