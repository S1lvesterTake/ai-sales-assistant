# AI Sales Assistant for UMKM

A full-stack portfolio project that helps Indonesian small businesses (UMKM) answer customer questions automatically via an AI-powered chatbot, collect leads, and manage product/FAQ data from a dashboard.

**Chatbot speaks Bahasa Indonesia by default** — designed for WhatsApp-style sales conversations with Indonesian customers.

---

## Architecture

```
┌─────────────────────────────┐     ┌──────────────────────────────┐
│     Frontend (Next.js)      │     │      Backend (NestJS)        │
│                             │     │                              │
│  • Landing page             │────▶│  • JWT Auth + Chat Token     │
│  • Public chatbot demo      │     │  • Business Profile CRUD     │
│  • Dashboard (products,     │     │  • Products & FAQs CRUD      │
│    FAQs, leads, settings)   │     │  • AI Chat (OpenAI/fake)     │
│                             │     │  • Lead Capture (dual auth)  │
│  /api/* route handlers      │     │  • WhatsApp Link + Click     │
│  (server-side BFF)          │     │  • Dashboard Aggregates      │
│                             │     │  • Swagger at /api/docs      │
└─────────────────────────────┘     └──────────────┬───────────────┘
                                                   │
                                                   ▼
                                        ┌──────────────────┐
                                        │   PostgreSQL 16   │
                                        │                  │
                                        │  9 tables        │
                                        │  Drizzle ORM     │
                                        └──────────────────┘
```

### Request Flow (Chat)

```
Customer ──POST /message──▶ Backend ──SELECT/INSERT──▶ PostgreSQL
                                  │
                                  ├── AI Provider (OpenAI / Fake)
                                  │     │
                                  │     └── Prompt Builder
                                  │         (business + products + FAQs)
                                  │
                                  ├── Buying Intent Detection
                                  │     (Indonesian/English keywords)
                                  │
                                  └──▶ Finalize (assistant + lead) ──▶ PostgreSQL
```

### Auth Model

| Boundary | Method | Scope |
|---|---|---|
| Public routes | `businessSlug` in URL | Never exposes internal UUIDs |
| Public chat | `X-Chat-Session-Token` (SHA-256 hash stored) | 24h expiry, timing-safe compare |
| Private dashboard | `Authorization: Bearer <JWT>` (bcrypt cost 12) | Every query scoped by ownership |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 + TypeScript + Tailwind CSS + Shadcn UI |
| Backend | NestJS 11 + TypeScript |
| Database | PostgreSQL 16 |
| ORM | Drizzle ORM + Drizzle Kit (migrations) |
| Validation | class-validator + class-transformer (DTO-based) |
| API Docs | Swagger / OpenAPI (`@nestjs/swagger`) at `/api/docs` |
| Auth | JWT (bcrypt) + SHA-256 hashed chat tokens |
| AI | OpenAI (GPT-4o-mini) behind replaceable provider interface |
| Testing | Jest + Supertest + disposable PostgreSQL containers |
| CI/Deploy | Docker + Docker Compose |

---

## Project Structure

```
ai-sales-assistant/
├── backend/                        # NestJS API server
│   ├── src/
│   │   ├── main.ts                 # Entry point
│   │   ├── app.module.ts           # Root module
│   │   ├── config/                 # Environment validation
│   │   ├── common/                 # Shared guards, filters, interceptors, utils
│   │   ├── database/
│   │   │   ├── schema/             # Drizzle table definitions (9 tables)
│   │   │   ├── migrations/         # Generated SQL migrations
│   │   │   └── seeds/              # Demo data seed/reset
│   │   └── modules/
│   │       ├── auth/               # JWT registration, login, current-user
│   │       ├── business-profile/   # Private CRUD + public slug lookup
│   │       ├── products/           # Ownership-scoped CRUD + filters
│   │       ├── faqs/               # Ownership-scoped CRUD + search
│   │       ├── chat/               # Sessions, AI processing, prompt builder
│   │       ├── leads/              # Dual-auth lead capture + management
│   │       ├── dashboard/          # Aggregates, widgets, conversation reads
│   │       ├── ai/                 # Provider interface + OpenAI + fake
│   │       ├── whatsapp/           # wa.me link generation + click tracking
│   │       ├── health/             # Health check endpoint
│   │       └── error-log/          # Best-effort DB error logging
│   ├── test/                       # Integration tests + E2E + helpers
│   ├── Dockerfile
│   └── package.json
├── frontend/                       # Next.js app
│   ├── app/                        # App Router pages
│   │   ├── (marketing)/            # Landing page
│   │   ├── demo-chat/              # Public chatbot demo
│   │   ├── login/                  # Login page
│   │   ├── dashboard/              # Protected business dashboard
│   │   ├── chat/[businessSlug]/    # Public chat by business
│   │   └── api/                    # BFF route handlers
│   ├── components/                 # UI components (shadcn-based)
│   │   ├── chat/                   # Chat experience, reducer, lead form
│   │   ├── dashboard/              # Dashboard overview
│   │   ├── products/               # Product CRUD components
│   │   ├── faqs/                   # FAQ CRUD components
│   │   ├── leads/                  # Lead management components
│   │   ├── shared/                 # Loading, empty, error states
│   │   └── ui/                     # Button, Card, Dialog, Input, etc.
│   ├── services/                   # API client functions
│   ├── types/                      # TypeScript interfaces
│   ├── lib/                        # Utilities, auth, validation
│   ├── mocks/                      # MSW fixtures + handlers (dev)
│   ├── tests/                      # 135+ unit/component tests
│   ├── e2e/                        # 14+ Playwright specs
│   └── Dockerfile
├── docker-compose.yml              # PostgreSQL + backend + frontend
├── docs/
│   ├── PRD_AI_Sales_Assistant_for_UMKM.md
│   ├── CLAUDE.md
│   ├── AGENTS.md
│   ├── BACKEND_DEVELOPMENT_PLAN.md
│   └── FRONTEND_DEVELOPMENT_PLAN.md
└── README.md
```

---

## Quick Start

### Prerequisites

- Node.js 24+
- Docker Desktop (or Docker 29+)
- npm 11+

### 1. Clone and start everything

```bash
git clone https://github.com/S1lvesterTake/ai-sales-assistant.git
cd ai-sales-assistant
docker compose up
```

This starts three services:
- **PostgreSQL 16** on port 5432 (auto-creates database)
- **Backend** on port 3001 (auto-migrates + seeds demo data, uses `AI_PROVIDER=fake`)
- **Frontend** on port 3000 (Next.js dev server, API mocking disabled)

### 2. Open the app

| URL | Description |
|---|---|
| `http://localhost:3000` | Landing page |
| `http://localhost:3000/demo-chat` | Public chatbot demo |
| `http://localhost:3000/login` | Dashboard login |
| `http://localhost:3001/api/docs` | Swagger API documentation |
| `http://localhost:3001/api/health` | Health check |

### 3. Demo credentials

| Field | Value |
|---|---|
| Email | `demo@kopisenja.id` |
| Password | `DemoKopiSenja2026!` |
| Business | Kopi Senja UMKM (Makassar) |
| Slug | `kopi-senja-umkm` |

---

## Backend

### Run standalone (without Docker)

```bash
cd backend
cp .env.example .env
# Edit .env with your DATABASE_URL and JWT_SECRET
npm ci
npm run db:migrate
npm run db:seed:demo
npm run start:dev
```

### Key configuration

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | (required) | PostgreSQL connection string |
| `JWT_SECRET` | (required) | Min 32 characters |
| `AI_PROVIDER` | `openai` | `openai` or `fake` (no API key needed) |
| `AI_TIMEOUT_MS` | `8000` | AI provider timeout |
| `CHAT_SESSION_TTL` | `86400` | Chat session lifetime in seconds |
| `CHAT_STALE_CLAIM_MS` | `30000` | Stale message reclamation threshold |
| `DEMO_USER_PASSWORD` | (required for seed) | Demo account password |

### Verification

```bash
cd backend
npm run lint              # ESLint with zero warnings
npm run typecheck         # TypeScript strict mode
npm test                  # 41 unit tests
npm run test:integration  # 119 PostgreSQL integration tests
npm run test:e2e          # 7 Supertest E2E tests
npm run build             # Production build
docker build -t ai-sales-assistant-backend .
```

### API Response Format

All endpoints return a standard envelope:

```json
// Single resource
{ "success": true, "message": "...", "data": { ... } }

// Paginated list
{ "success": true, "message": "...", "data": [...], "meta": { "page": 1, "limit": 20, "total": 25, "totalPages": 2 } }

// Validation error
{ "success": false, "message": "Validation failed", "errors": [{ "field": "phone", "message": "..." }] }
```

---

## Database

Nine tables with explicit foreign keys, check constraints, composite indexes, and enum types:

| Table | Key Constraints |
|---|---|
| `users` | Unique email, `is_demo` flag |
| `business_profiles` | Unique slug, unique user_id, WhatsApp format check |
| `products` | Price >= 0 check, composite indexes for availability/category |
| `faqs` | Active-flag index |
| `chat_sessions` | SHA-256 token hash, expiry, phone format check |
| `chat_messages` | Unique (session, clientMessageId), unique reply_to, processing status enum, role CHECKs |
| `leads` | Unique (business, phone), status enum, composite indexes |
| `whatsapp_click_events` | Optional session/lead FKs with SET NULL on delete |
| `error_logs` | JSONB metadata, best-effort persistence |

---

## AI Chat Architecture

The AI provider is abstracted behind a replaceable interface (`AiProvider`). The MVP includes:

| Provider | Use |
|---|---|
| `OpenAiProvider` | Production — GPT-4o-mini, 8s timeout via AbortController |
| `FakeAiProvider` | All automated tests — deterministic responses, no API key |

### Chat State Machine

```
New message ──▶ INSERT (pending) ──▶ AI Call (no DB tx) ──▶ Finalize (assistant + completed)
                     │                        │
                     │                        └── Failure ──▶ Persist FALLBACK_RESPONSE
                     │
Duplicate? ──▶ completed ──▶ Return stored reply (idempotent)
              pending ──▶ Stale? ──▶ Reclaim and process
                          Active ──▶ HTTP 202 (still processing)
              failed ──▶ Reclaim and process
```

### Key idempotency guarantees

- `clientMessageId` uniqueness enforced at DB level
- Duplicate completed: returns stored result, zero AI calls
- Duplicate pending: returns 202, no parallel AI call
- Stale claim (30s default): reclaimed with compare-and-set UPDATE
- AI call happens outside any database transaction
- Fallback response persisted as a completed assistant message

---

## Frontend

### Run standalone

```bash
cd frontend
cp .env.example .env.local
npm ci
npm run dev
```

### State coverage

Every UI component handles: **loading**, **empty**, **error**, and **success** states via reusable shared components (`LoadingState`, `EmptyState`, `ErrorState`).

### Auth flow

1. Login via `POST /api/auth/login` (backend BFF route handler)
2. JWT stored in **HttpOnly cookie** (not localStorage)
3. Server-side data fetching with `Bearer` token
4. Session expiry detection with redirect to login

### Public chat

1. Session token stored in `sessionStorage` only
2. Sent via `X-Chat-Session-Token` header
3. Token never appears in URLs, logs, or analytics

---

## Testing

| Type | Count | Technology | Scope |
|---|---|---|---|
| Backend unit | 41 | Jest | Phone utils, auth, token, env validation |
| Backend integration | 119 | Jest + Docker PostgreSQL | All 9 modules, constraints, concurrency |
| Backend E2E | 7 | Supertest | Swagger contract, transport, validation, rate limit |
| Frontend unit | 135+ | Jest + RTL | Components, services, auth, forms, chat reducer |
| Frontend E2E | 14+ | Playwright | Auth, chat, dashboard, products, FAQs, leads, landing |

### Key backend test scenarios

- Cross-owner access isolation (404, never 403)
- Concurrent duplicate lead creation (unique constraint guard)
- Concurrent duplicate chat message (one 200, one 202)
- Duplicate retry returns stored result (exactly 1 AI call)
- AI provider failure persists fallback response
- Phone normalization matrix (08/628/+628 → canonical 62)
- Pagination bounds enforcement
- Demo profile field immutability
- Chat token: missing, invalid, expired, wrong-session, wrong-business

---

## Deployment

### Docker (local)

```bash
docker compose up -d          # Start all services detached
docker compose logs -f backend  # Follow backend logs
docker compose down -v          # Stop and remove volumes
```

### Railway (production)

Each service is a separate Railway service from a single repo:

| Service | Source | Notes |
|---|---|---|
| PostgreSQL | Railway DB service | Managed PostgreSQL |
| Backend | `backend/` Dockerfile | `NODE_ENV=production` |
| Frontend | `frontend/` Dockerfile | `NODE_ENV=production` |

Environment variables are set per-service in Railway, not committed to the repo.

---

## API Endpoints

### Auth
| Method | Path | Auth |
|---|---|---|
| `POST` | `/api/auth/register` | Public |
| `POST` | `/api/auth/login` | Public |
| `GET` | `/api/auth/me` | JWT |

### Business Profile
| Method | Path | Auth |
|---|---|---|
| `POST` | `/api/business-profile` | JWT |
| `GET` | `/api/business-profile` | JWT |
| `PATCH` | `/api/business-profile` | JWT |
| `GET` | `/api/public/businesses/:businessSlug` | Public |

### Products
| Method | Path | Auth |
|---|---|---|
| `POST` | `/api/products` | JWT |
| `GET` | `/api/products` (?category=&isAvailable=) | JWT |
| `GET` | `/api/products/:id` | JWT |
| `PATCH` | `/api/products/:id` | JWT |
| `DELETE` | `/api/products/:id` | JWT |

### FAQs
| Method | Path | Auth |
|---|---|---|
| `POST` | `/api/faqs` | JWT |
| `GET` | `/api/faqs` (?search=&category=&isActive=) | JWT |
| `GET` | `/api/faqs/:id` | JWT |
| `PATCH` | `/api/faqs/:id` | JWT |
| `DELETE` | `/api/faqs/:id` | JWT |

### Chat
| Method | Path | Auth |
|---|---|---|
| `POST` | `/api/public/businesses/:businessSlug/chat/sessions` | Public |
| `POST` | `.../sessions/:sessionId/messages` | Chat Token |
| `GET` | `.../sessions/:sessionId/messages` | Chat Token |

### Leads
| Method | Path | Auth |
|---|---|---|
| `POST` | `/api/leads` | JWT (manual) |
| `POST` | `/api/leads/from-chat/:businessSlug` | Chat Token |
| `GET` | `/api/leads` (?search=&status=) | JWT |
| `GET` | `/api/leads/:id` | JWT |
| `PATCH` | `/api/leads/:id/status` | JWT |

### WhatsApp
| Method | Path | Auth |
|---|---|---|
| `GET` | `/api/public/businesses/:businessSlug/whatsapp/link` | Public* |
| `POST` | `/api/public/businesses/:businessSlug/whatsapp-clicks` | Public* |

*Token required only when `sessionId` or `leadId` is provided.

### Dashboard
| Method | Path | Auth |
|---|---|---|
| `GET` | `/api/dashboard/summary` | JWT |
| `GET` | `/api/dashboard/recent-leads` (?limit=5) | JWT |
| `GET` | `/api/dashboard/recent-conversations` (?limit=5) | JWT |
| `GET` | `/api/dashboard/top-questions` (?limit=5) | JWT |
| `GET` | `/api/dashboard/conversations/:sessionId/messages` | JWT |

### System
| Method | Path | Auth |
|---|---|---|
| `GET` | `/api/health` | Public |

---

## Demo Business

The seeded demo business "Kopi Senja UMKM" is a fictional coffee shop in Makassar with:

- 4 products (Kopi Susu Gula Aren, Es Kopi Hitam, Paket Kopi + Pancong, Ketan Susu)
- 3 FAQs (event ordering, opening hours, delivery)
- Demo account is immutable through the dashboard (identity fields protected)
- Idempotent reset via `DEMO_DATA_RESET_ON_DEPLOY=true npm run db:reset:demo`

---

## Portfolio Context

This project is designed as a focused portfolio piece demonstrating:

- **Backend engineering**: NestJS, PostgreSQL, Drizzle ORM, JWT auth, idempotent state machines
- **AI integration**: Provider abstraction, prompt engineering, buying intent detection
- **API design**: RESTful conventions, Swagger/OpenAPI, DTO validation, standard error envelopes
- **Testing**: Unit, integration (real PostgreSQL), E2E, contract tests — 160+ tests total
- **Full-stack delivery**: Docker Compose, multi-stage Dockerfiles, Railway-ready deployment
- **Security**: Ownership scoping, timing-safe token comparison, phone normalization, safe logging
- **Documentation**: PRD, development plans, contract gap report, Swagger, README
