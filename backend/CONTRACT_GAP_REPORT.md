# Backend-Frontend Contract Gap Report

Generated: 2026-06-15 | For: FE-11 Integration Task

## Summary

The standalone backend implements all PRD endpoints. This report documents
differences between the backend Swagger contract and the existing frontend
services/types/MSW handlers for the FE-11 integration task.

## Endpoint Mapping

| Frontend Service | Expected Path | Backend Status |
|---|---|---|
| `auth.service.ts` | `POST /api/auth/login` | ✅ Match |
| `auth.service.ts` | `POST /api/auth/register` | ✅ Match |
| `auth.service.ts` | `GET /api/auth/me` | ✅ Match |
| `business-profile.service.ts` | `POST /api/business-profile` | ✅ Match |
| `business-profile.service.ts` | `GET /api/business-profile` | ✅ Match |
| `business-profile.service.ts` | `PATCH /api/business-profile` | ✅ Match |
| `business-profile.service.ts` | `GET /api/public/businesses/:slug` | ✅ Match |
| `products.service.ts` | `POST/GET /api/products` | ✅ Match |
| `products.service.ts` | `GET/PATCH/DELETE /api/products/:id` | ✅ Match |
| `faqs.service.ts` | `POST/GET /api/faqs` | ✅ Match |
| `faqs.service.ts` | `GET/PATCH/DELETE /api/faqs/:id` | ✅ Match |
| `chat.service.ts` | `POST .../chat/sessions` | ✅ Match |
| `chat.service.ts` | `POST .../sessions/:id/messages` | ✅ Match |
| `chat.service.ts` | `GET .../sessions/:id/messages` | ✅ Match |
| `leads.service.ts` | `POST/GET /api/leads` | ✅ Match |
| `leads.service.ts` | `GET /api/leads/:id` | ✅ Match |
| `leads.service.ts` | `POST /api/leads` (from chat) | ✅ Match (`/api/leads/from-chat/:businessSlug`) |
| `leads.service.ts` | `PATCH /api/leads/:id/status` | ✅ Match |
| `whatsapp.service.ts` | `GET .../whatsapp/link` | ✅ Match |
| `whatsapp.service.ts` | `POST .../whatsapp-clicks` | ✅ Match |
| `dashboard.service.ts` | `GET /api/dashboard/summary` | ✅ Match |
| `dashboard.service.ts` | `GET /api/dashboard/recent-leads` | ✅ Match |
| `dashboard.service.ts` | `GET /api/dashboard/recent-conversations` | ✅ Match |
| `dashboard.service.ts` | `GET /api/dashboard/top-questions` | ✅ Match |

## Known Differences

### 1. Chat Lead Creation Path
- **Frontend**: `leadsService.createFromChat()` calls `POST /api/leads` with `sessionToken`
- **Backend**: Uses `POST /api/leads/from-chat/:businessSlug` for chat-token auth
- **Action**: Update `leads.service.ts` to call the `from-chat/:businessSlug` path or update backend to accept both auth modes on `POST /api/leads`

### 2. Product Name Uniqueness
- **Frontend MSW**: May assume product names are unique per business
- **Backend**: Product names are not unique (no constraint)
- **Action**: Update MSW handlers to not rely on name-based lookup

### 3. HTTP Status for Chat Messages
- **Frontend**: Expects `201` for new messages, `200` for retry
- **Backend**: Returns `200` for all (new, completed retry), `202` for pending
- **Impact**: Frontend already handles `200` as success — compatible

### 4. AI Provider Dependency
- **Backend**: Requires `OPENAI_API_KEY` for `AI_PROVIDER=openai`
- **Test mode**: Set `AI_PROVIDER=fake` for development without API key
- **Action**: Add `AI_PROVIDER` to frontend `.env.example` documentation

### 5. WhatsApp URL Generation
- **Frontend**: Dedicated `GET .../whatsapp/link` endpoint
- **Backend**: Returns `{ url: "https://wa.me/62..." }` with prefilled message
- **Match**: ✅ Response shape matches `WhatsappLink` type

### 6. Dashboard Widget Responses
- **Frontend**: Wraps each widget in `DashboardWidgetResult<T>` (status + data)
- **Backend**: Returns standard envelope `{ success, data }` 
- **Action**: Frontend already handles `ApiSuccessResponse<T>` — minor adapter needed

## MSW Handler Migration

The following MSW handlers will need updating:
1. `POST /api/leads` chat-token variant → use `from-chat/:businessSlug`
2. Remove any hardcoded demo credentials (backend uses real JWT)
3. Product handlers — remove name-uniqueness assumptions
4. Chat message handler — update status code expectations (200 vs 201)

## Integration Prerequisites

Before starting FE-11:
1. ✅ All BE parts complete (BE-00 through BE-11)
2. ✅ Swagger available at `/api/docs` as live contract source
3. ✅ Backend runs against seeded PostgreSQL with `AI_PROVIDER=fake`
4. ✅ Backend Docker image builds
5. ⚠️ Integration tests require Docker for PostgreSQL container
6. ✅ No critical ownership, token, or idempotency issues remain

## Remaining Work (BE-11 hardening)
- PostgreSQL integration test verification (Docker required)
- Docker image build and startup verification
- EXPLAIN plan review for critical queries
- Root docker-compose.yml wiring (deferred to FE-11)
