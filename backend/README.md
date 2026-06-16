# AI Sales Assistant Backend

Standalone NestJS API for the AI Sales Assistant for Indonesian UMKM.

## Requirements

- Node.js 24
- npm 11
- Docker 29 or newer for container verification
- PostgreSQL 16

## Quick Start

```bash
npm ci
cp .env.example .env
# Edit .env with your DATABASE_URL and JWT_SECRET
npm run db:migrate
npm run start:dev
```

The API listens on `http://localhost:3001` by default. Swagger is available at
`http://localhost:3001/api/docs`.

## Configuration

| Variable | Default | Description |
|---|---|---|
| `NODE_ENV` | `development` | Environment |
| `PORT` | `3001` | HTTP port |
| `FRONTEND_URL` | `http://localhost:3000` | CORS origin (comma-separated) |
| `DATABASE_URL` | (required) | PostgreSQL connection string |
| `DATABASE_POOL_MAX` | `10` | Connection pool size |
| `JWT_SECRET` | (required) | JWT signing secret (min 32 chars) |
| `JWT_EXPIRES_IN` | `3600` | JWT expiry in seconds |
| `AI_PROVIDER` | `openai` | AI provider: `openai` or `fake` |
| `OPENAI_API_KEY` | (required for prod) | OpenAI API key |
| `OPENAI_MODEL` | `gpt-4o-mini` | OpenAI model |
| `AI_TIMEOUT_MS` | `8000` | AI provider timeout |
| `CHAT_SESSION_TTL` | `86400` | Chat session lifetime (seconds) |
| `CHAT_STALE_CLAIM_MS` | `30000` | Stale message claim threshold |
| `DEMO_USER_PASSWORD` | (required for seed) | Demo account password |
| `DEMO_DATA_RESET_ON_DEPLOY` | `false` | Enable demo reset guard |

## Database

Schema changes are defined in `src/database/schema` and generated into SQL
migrations through Drizzle Kit.

```bash
npm run db:generate   # Generate migration from schema changes
npm run db:migrate    # Apply pending migrations
npm run db:push       # Push schema directly (dev only)
npm run db:studio     # Open Drizzle Studio
```

Nine tables: `users`, `business_profiles`, `products`, `faqs`,
`chat_sessions`, `chat_messages`, `leads`, `whatsapp_click_events`,
`error_logs`.

Integration tests start a disposable PostgreSQL 16 container and verify the
empty-database migration, constraints, indexes, and delete behavior.

## Demo Data

The trusted demo command creates the `Kopi Senja UMKM` account and restores its
documented products and FAQs. Configure `DEMO_USER_PASSWORD` with the public
portfolio credential `DemoKopiSenja2026!` before running it.

- Email: `demo@kopisenja.id`
- Password: `DemoKopiSenja2026!`
- Public slug: `kopi-senja-umkm`

```bash
npm run db:seed:demo
DEMO_DATA_RESET_ON_DEPLOY=true npm run db:reset:demo
```

Reset is an explicit transactional CLI operation. It refuses to run unless the
guard is exactly `true`, removes only records owned by the marked demo account,
and is never invoked automatically during application startup.

## API Modules

| Module | Endpoints | Auth |
|---|---|---|
| Health | `GET /api/health` | Public |
| Auth | `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me` | Public / JWT |
| Business Profile | `POST/GET/PATCH /api/business-profile` | JWT |
| Public Business | `GET /api/public/businesses/:businessSlug` | Public |
| Products | `POST/GET /api/products`, `GET/PATCH/DELETE /api/products/:id` | JWT |
| FAQs | `POST/GET /api/faqs`, `GET/PATCH/DELETE /api/faqs/:id` | JWT |
| Chat Sessions | `POST /api/public/businesses/:businessSlug/chat/sessions` | Public |
| Chat Messages | `POST/GET .../sessions/:sessionId/messages` | Chat Token |
| Leads | `POST/GET /api/leads`, `GET /api/leads/:id`, `PATCH /api/leads/:id/status` | JWT |
| Leads (Chat) | `POST /api/leads/from-chat/:businessSlug` | Chat Token |
| WhatsApp | `GET /api/public/businesses/:businessSlug/whatsapp/link` | Public / Chat Token |
| WhatsApp | `POST /api/public/businesses/:businessSlug/whatsapp-clicks` | Public / Chat Token |
| Dashboard | `GET /api/dashboard/summary`, `.../recent-leads`, `.../recent-conversations`, `.../top-questions` | JWT |
| Dashboard | `GET /api/dashboard/conversations/:sessionId/messages` | JWT |

## API Response Format

All endpoints use the standard envelope:

```json
{ "success": true, "message": "...", "data": { ... } }
{ "success": true, "message": "...", "data": [...], "meta": { "page": 1, "limit": 20, "total": 25, "totalPages": 2 } }
{ "success": false, "message": "...", "errors": [{ "field": "phone", "message": "..." }] }
```

## AI Integration

The AI provider is abstracted behind a replaceable interface (`src/modules/ai/`).
Set `AI_PROVIDER=openai` for production or `AI_PROVIDER=fake` for tests.
The fake provider returns deterministic responses and is used in all automated
tests — no live API key is required for testing.

## Verification

```bash
npm run lint              # ESLint with zero warnings
npm run typecheck         # TypeScript strict mode
npm test                  # Unit tests (41)
npm run test:integration  # PostgreSQL integration tests (103)
npm run test:e2e          # Supertest E2E tests (7)
npm run test:coverage     # Coverage report
npm run build             # Production build
npm audit --audit-level=high
```

## Container

```bash
docker build -t ai-sales-assistant-backend .
docker run --rm -p 3001:3001 --env-file .env ai-sales-assistant-backend
```

The image runs as a non-root `node` user and listens on port 3001.

## Architecture

- **Framework**: NestJS with TypeScript strict mode
- **Database**: PostgreSQL via Drizzle ORM (connection pooling)
- **Auth**: JWT (bcrypt cost 12) for dashboard, SHA-256 hashed tokens for chat
- **Validation**: class-validator DTOs with global ValidationPipe
- **API Docs**: Swagger/OpenAPI at `/api/docs`
- **Logging**: Structured JSON logs with correlation IDs
- **Testing**: Jest + Supertest + disposable PostgreSQL containers
- **AI**: Provider abstraction with OpenAI adapter and deterministic fake
