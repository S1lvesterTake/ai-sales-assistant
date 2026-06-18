# Dev Standards Review — Action Items

Review date: 2026-06-16 | Last updated: 2026-06-17 | Scope: full codebase (backend 134 files, frontend completed through FE-10)

## Current Status

| Part | Status | Dev Standards Impact |
|---|---|---|
| BE-00 → BE-11 | `COMPLETE` | All backend standards verified |
| FE-00 → FE-10 | `COMPLETE` | All frontend standards verified through business settings |
| FE-11 | `IN_PROGRESS` | Medium-priority items 1–3 to be applied here |
| FE-12 | `NOT_STARTED` | Low-priority items 5–7, 9–11 to be evaluated here |

---

## High Priority (fix before production)

_None identified._ All critical security, reliability, and data integrity gates pass.

---

## Medium Priority (fix during FE-11 integration)

### 1. Extract shared slug validation (DRY)
- **Files**: `ChatService`, `WhatsappService`, `LeadsService`
- **Problem**: `resolveBusiness()` with slug regex is duplicated in 3 services
- **Fix**: Create `common/utils/slug.ts` with `validateSlug()` and `resolveBusinessBySlug()`

### 2. AI provider retry with backoff
- **File**: `chat-processing.service.ts`
- **Problem**: AI failure → immediate fallback, no retry
- **Fix**: Add 1 retry with 2s backoff before fallback (within 8s timeout budget)

### 3. Split ChatProcessingService.handleExisting()
- **File**: `chat-processing.service.ts:187-279`
- **Problem**: One method handles completed/pending/failed states
- **Fix**: Split into `handleCompleted()`, `handlePending()`, `handleFailed()`

### 4. Mark BE-11 COMPLETE in dev plan ✅ Fixed
- **File**: `docs/BACKEND_DEVELOPMENT_PLAN.md`
- **Problem**: BE-11 status still `IN_PROGRESS`; all verification passed
- **Fix**: Updated status to `COMPLETE`

---

## Low Priority (nice to have)

### 5. Route-specific rate limiting
- **Files**: Chat controller, WhatsApp controller
- **Problem**: `CHAT_SESSION_CREATE_LIMIT` and `CHAT_MESSAGE_LIMIT` env vars not wired to `@Throttle()` decorators
- **Fix**: Add `@Throttle({ default: { limit: 10, ttl: 60000 } })` on session creation etc.

### 6. Extract landing page content to locale files
- **File**: `frontend/app/(marketing)/page.tsx`
- **Problem**: ~200 line inline content dictionary
- **Fix**: Move to `frontend/locales/id.ts` and `frontend/locales/en.ts`

### 7. Dashboard N+1 query optimization
- **File**: `dashboard.repository.ts:90-120`
- **Problem**: `getRecentConversations()` fetches last message per session individually
- **Fix**: Use `LATERAL JOIN` or window function (acceptable for bounded 5-20 items)

### 8. Concurrent duplicate chat message test
- **File**: `test/chat-processing.integration-spec.ts`
- **Status**: Already implemented (DI-overridden provider with delay)
- **Note**: Already fixed — concurrent test exists at line 208

### 9. Stale claim recovery after crash simulation
- **File**: `test/chat-processing.integration-spec.ts`
- **Problem**: No test for process crash after provider return but before final transaction
- **Fix**: Add test that simulates this scenario and verifies idempotent recovery

### 10. Empty-database migration re-verification
- **Problem**: Migration verified in BE-02 but not re-run in final hardening suite
- **Fix**: Add to CI/pre-push hook: `docker run postgres && npm run db:migrate`

### 11. Frontend MSW handler migration
- **File**: `frontend/mocks/handlers.ts`
- **Problem**: 6 contract differences documented in `backend/CONTRACT_GAP_REPORT.md`
- **Status**: Partially complete — business profile POST/PATCH handlers added in FE-10 ✅
- **Remaining**: Chat lead creation path, product name uniqueness, message status codes, dashboard adapter shape, WhatsApp shape match, AI provider env — to be resolved in FE-11 against live Swagger

---

## Verified — No Action Needed

| Area | Finding |
|---|---|
| Secrets | No hardcoded credentials |
| SQL Injection | Drizzle ORM with parameterized queries |
| XSS | No `dangerouslySetInnerHTML` |
| Auth | JWT on all private endpoints; SHA-256 tokens on chat |
| Ownership | Every private query scoped by `businessProfileId` |
| Input validation | 172 class-validator decorators; `whitelist: true` |
| Token safety | Timing-safe comparison; raw tokens never in DB |
| Timeouts | AI 8s via AbortController; DB pool configurable |
| Idempotency | `clientMessageId` unique constraint; completed retry returns stored |
| Fallback | AI failure persists Indonesian fallback as completed |
| Transactions | No DB tx during AI call; atomic finalization |
| Health check | Verifies actual DB connectivity |
| Testing | 41 unit + 119 integration + 7 E2E; cross-owner, concurrency, idempotency |
