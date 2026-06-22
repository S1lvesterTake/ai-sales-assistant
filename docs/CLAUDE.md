# CLAUDE.md

## Project Overview

AI Sales Assistant for UMKM — a full-stack portfolio product for Indonesian small businesses. Provides a public AI chatbot (Bahasa Indonesia), lead capture, WhatsApp handoff, and an authenticated owner dashboard. Status: **development**, targeting Railway deployment.

→ For execution guardrails: `docs/AGENTS.md`
→ For product requirements: `docs/PRD_AI_Sales_Assistant_for_UMKM.md`
→ For Railway deployment: `docs/RAILWAY_DEPLOYMENT.md`

---

## Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Backend | NestJS + TypeScript | ^11.0.1 |
| Frontend | Next.js + TypeScript + Tailwind + Shadcn UI | 16.2.9 |
| Database | PostgreSQL 16 + Drizzle ORM | drizzle-orm ^0.45 |
| Auth | JWT via Passport + bcrypt | — |
| AI | OpenAI (fake provider for tests) | gpt-4o-mini |
| Testing | Jest + Supertest + Playwright | — |
| Deployment | Railway (Docker) | Node 24.15 |

---

## Backend Module Catalog

All modules live under `backend/src/modules/`.

| Module | Path | Purpose |
|---|---|---|
| `auth` | `modules/auth/` | Registration, login, JWT issue/verify |
| `business-profile` | `modules/business-profile/` | Owner profile CRUD + public slug lookup |
| `products` | `modules/products/` | Product catalog CRUD |
| `faqs` | `modules/faqs/` | FAQ CRUD for chatbot knowledge base |
| `chat` | `modules/chat/` | Chat sessions, AI orchestration, buying-intent detection, idempotent message processing |
| `leads` | `modules/leads/` | Lead capture from chat, status management |
| `dashboard` | `modules/dashboard/` | Aggregated metrics and recent activity for the owner view |
| `ai` | `modules/ai/` | AI provider abstraction — `openai.provider.ts` + `fake-ai.provider.ts` |
| `whatsapp` | `modules/whatsapp/` | WhatsApp link generation and click tracking |
| `health` | `modules/health/` | `GET /api/health` — DB connectivity check |
| `error-log` | `modules/error-log/` | Best-effort DB error logging (supplemental to stdout) |

Shared utilities: `backend/src/common/` — guards, decorators, filters, interceptors, slug utils, phone utils.

---

## Frontend Route Map

All routes live under `frontend/app/`.

| Route | Purpose |
|---|---|
| `(marketing)/` | Public landing page |
| `chat/[slug]/` | Public chatbot UI for a given business slug |
| `login/` | Owner login page |
| `dashboard/` | Protected owner dashboard |
| `dashboard/settings/` | Business profile settings |
| `dashboard/products/` | Product management |
| `dashboard/faqs/` | FAQ management |
| `dashboard/leads/` | Lead list and status updates |
| `api/auth/` | BFF auth routes (login, logout, me) |
| `api/dashboard/settings/` | BFF proxy for business profile updates |

---

## Project Structure

```
ai-sales-assistant/
├── backend/
│   ├── src/
│   │   ├── common/          # Guards, decorators, filters, interceptors, utils
│   │   ├── config/          # Env validation (bootstrap-env.ts, environment.validation.ts)
│   │   ├── database/
│   │   │   ├── schema/      # Drizzle table definitions (barrel: schema/index.ts)
│   │   │   ├── migrations/  # Drizzle Kit generated SQL — never edit manually
│   │   │   └── seeds/       # Idempotent demo seed + reset
│   │   └── modules/         # Feature modules (see catalog above)
│   ├── test/                # Integration + E2E specs
│   ├── Dockerfile
│   └── .env.example
├── frontend/
│   ├── app/                 # Next.js App Router (see route map above)
│   ├── components/          # UI components (ui/ = Shadcn, others = custom)
│   ├── lib/                 # Auth, settings, env validation, API client
│   ├── mocks/               # MSW handlers for local development
│   ├── services/            # Typed API service classes
│   ├── tests/               # Jest unit/component tests
│   ├── e2e/                 # Playwright specs
│   ├── Dockerfile
│   └── .env.example
├── docs/
│   ├── AGENTS.md            # Execution guardrails (constraints, forbidden patterns, security)
│   ├── CLAUDE.md            # This file — project orientation
│   ├── RAILWAY_DEPLOYMENT.md
│   ├── PRD_AI_Sales_Assistant_for_UMKM.md
│   ├── FRONTEND_DEVELOPMENT_PLAN.md
│   └── BACKEND_DEVELOPMENT_PLAN.md
├── docker-compose.yml       # Dev: hot-reload, volume mounts
├── docker-compose.prod.yml  # Prod-like: compiled images, no mounts
└── Makefile                 # Convenience commands
```

---

## Quick Reference Commands

### Docker (from repo root)
```bash
make dev          # start all services — dev mode (hot-reload)
make prod         # start all services — production mode
make down         # stop all containers
make reset        # stop + wipe all volumes (fresh DB)
make seed         # re-run demo seed against running dev stack
```

### Backend (from `backend/`)
```bash
npm run start:dev        # dev server with hot-reload
npm test                 # unit tests
npm run test:integration # integration tests (needs Docker Postgres)
npm run test:e2e         # E2E tests
npm run build            # compile TypeScript
npm run lint             # ESLint
npm run typecheck        # tsc --noEmit
npm run db:generate      # generate Drizzle migration from schema changes
npm run db:migrate       # apply pending migrations
npm run db:studio        # open Drizzle Studio UI
```

### Frontend (from `frontend/`)
```bash
npm run dev        # dev server (port 3000)
npm test           # Jest unit/component tests
npm run test:e2e   # Playwright E2E
npm run build      # production build
npm run lint       # ESLint
npm run typecheck  # tsc --noEmit
```

---

## Key File Pointers

| What you need | Where to look |
|---|---|
| Execution rules (NEVER/ALWAYS) | `docs/AGENTS.md` |
| Frontend-specific rules | `frontend/AGENTS.md` |
| Product requirements + API spec | `docs/PRD_AI_Sales_Assistant_for_UMKM.md` |
| Frontend task tracker | `docs/FRONTEND_DEVELOPMENT_PLAN.md` |
| Backend task tracker | `docs/BACKEND_DEVELOPMENT_PLAN.md` |
| Railway deployment guide | `docs/RAILWAY_DEPLOYMENT.md` |
| Database schema (Drizzle) | `backend/src/database/schema/index.ts` |
| Backend env vars | `backend/.env.example` |
| Frontend env vars | `frontend/.env.example` |
| Dev standards (review skill) | invoke `/dev-standards` |

---

## API Response Envelope

All backend endpoints return this shape (enforced by `ResponseInterceptor`):

```json
// Success
{ "success": true, "message": "...", "data": { ... } }

// Paginated
{ "success": true, "message": "...", "data": [...], "meta": { "page": 1, "limit": 10, "total": 25, "totalPages": 3 } }

// Error
{ "success": false, "message": "Validation failed", "errors": [{ "field": "price", "message": "..." }] }
```

---

## Database Tables

Nine tables: `users`, `business_profiles`, `products`, `faqs`, `chat_sessions`, `chat_messages`, `leads`, `whatsapp_click_events`, `error_logs`.

Schema barrel: `backend/src/database/schema/index.ts`
Migrations: `backend/src/database/migrations/` — generated by Drizzle Kit, never edited manually.

## Pattern References

When scaffolding a new module, use these as canonical examples:
- CRUD module: backend/src/modules/products/
- Repository pattern: backend/src/modules/products/products.repository.ts
- Service pattern: backend/src/modules/products/products.service.ts
- DTO pattern: backend/src/modules/products/dto/
