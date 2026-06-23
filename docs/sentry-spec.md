# Sentry Integration Spec — AI Sales Assistant Backend

## 1. Overview

Sentry captures **unexpected 5xx failures** from the NestJS backend. Expected
client-side failures (auth, validation, not-found) are never sent — they are
noise, not bugs.

**What Sentry captures in this project:**
- Unhandled exceptions that produce a 500 Internal Server Error
- Unhandled promise rejections from the NestJS lifecycle
- Uncaught Node.js runtime exceptions

**What Sentry never captures:**
- 400 Bad Request (malformed body, invalid JSON)
- 401 Unauthorized / 403 Forbidden (auth failures)
- 404 Not Found
- 409 Conflict / 422 Unprocessable Entity (validation failures)
- 429 Too Many Requests (rate limit)

The rule: **`status >= 500` → capture. `status < 500` → ignore.**

---

## 2. Installation

```bash
# from backend/
npm install @sentry/nestjs @sentry/node
```

No webpack plugin. Railway compiles TypeScript directly from source.

---

## 3. Initialization

### File: `backend/src/instrument.ts`

Sentry must be initialized **before** `NestFactory.create()` so its async-context
hooks and unhandled-rejection listeners are in place from the start.

```typescript
import * as Sentry from '@sentry/nestjs';

export function initSentry(): void {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? 'development',
    tracesSampleRate: 0,    // errors only — no performance monitoring
    sendDefaultPii: false,  // never send PII to Sentry
  });
}
```

### `process.env` exception

`instrument.ts` is bootstrap infrastructure — the DI container does not exist
yet. This is the **one allowed exception** to the "no `process.env`" rule
(§3 Forbidden Patterns). The precedent is `bootstrap-env.ts`, which reads
`PORT` and `NODE_ENV` before ConfigService is available.

`SENTRY_DSN` must still be declared in `environment.validation.ts` as an
optional passthrough so ConfigService exposes it for any future use:

```typescript
// in validateEnvironment return value
SENTRY_DSN: typeof environment.SENTRY_DSN === 'string'
  ? environment.SENTRY_DSN
  : undefined,
```

### `backend/src/main.ts` — call order

`initSentry()` must be the **first call** in `bootstrap()`, before
`NestFactory.create()`:

```typescript
import { initSentry } from './instrument';

async function bootstrap() {
  initSentry();                          // ← must be first
  const app = await NestFactory.create(AppModule, { ... });
  ...
}
```

---

## 4. What to capture

Sentry capture lives in the existing `HttpExceptionFilter.catch()` — the
single place all exceptions funnel through.

```typescript
if (status >= 500) {
  Sentry.captureException(exception, {
    extra: {
      correlationId: request.correlationId,
      method: request.method,
      path: request.path,
      statusCode: status,
    },
  });
}
```

### correlationId availability

`request.correlationId` is set by the Pino HTTP middleware on every 
incoming request (configured in Section 12 of AGENTS.md). If correlationId 
is undefined (e.g. in tests), use a fallback:

```typescript
correlationId: request.correlationId ?? 'unknown',
```

The `extra` payload must **not** include:
- `userId` / `businessProfileId` (internal IDs — §12 NEVER log rule)
- Any request body field
- Authorization header values

---

## 5. What NOT to capture

`Sentry.captureException` must not be called for any `status < 500`.
The existing filter already distinguishes these; no new logic is needed —
just gate the Sentry call behind the `status >= 500` check above.

---

## 6. Environment handling

| Scenario | Behaviour |
|---|---|
| `SENTRY_DSN` absent / empty string | `initSentry()` returns immediately — `Sentry.init` is never called |
| `SENTRY_DSN` set (Railway production) | `Sentry.init` is called with that DSN |
| `NODE_ENV=test` | `SENTRY_DSN` is not set in test env → init skipped automatically |

Add to `backend/.env.example`:
```
SENTRY_DSN=   # leave empty in dev; set in Railway production secrets
```

**Never** add `SENTRY_DSN` to Railway public variables — keep it in Railway's
secret/private environment group.

---

## 7. Config pattern

| Context | How to read `SENTRY_DSN` | Reason |
|---|---|---|
| `instrument.ts` | `process.env.SENTRY_DSN` | DI container not yet started |
| Anywhere else | `configService.get<string>('SENTRY_DSN')` | Normal ConfigService pattern |

---

## 8. Test requirements

### `backend/src/instrument.spec.ts` (new file)

| # | Test | Assertion |
|---|---|---|
| T1 | DSN present → `Sentry.init` called | `Sentry.init` spy called once with `{ dsn }` |
| T2 | DSN absent → `Sentry.init` not called | `Sentry.init` spy never called |
| T3 | DSN empty string → `Sentry.init` not called | Same as T2 |

### `backend/src/common/filters/http-exception.filter.spec.ts` (extended)

| # | Test | Assertion |
|---|---|---|
| T4 | 500 exception → `captureException` called | Spy called once; `extra.statusCode === 500` |
| T5 | 404 exception → `captureException` NOT called | Spy never called |
| T6 | 401 exception → `captureException` NOT called | Spy never called |
| T7 | 422 exception → `captureException` NOT called | Spy never called |

---

## 9. Acceptance Criteria

All items are binary pass/fail. The PR is not mergeable until every box is checked.

### Packages
- [ ] `@sentry/nestjs` in `backend/package.json` dependencies
- [ ] `@sentry/node` in `backend/package.json` dependencies

### Initialization
- [ ] `backend/src/instrument.ts` exists and exports `initSentry()`
- [ ] `initSentry()` is called before `NestFactory.create()` in `main.ts`
- [ ] `Sentry.init` is NOT called when `SENTRY_DSN` is absent or empty
- [ ] `Sentry.init` IS called with correct DSN when `SENTRY_DSN` is set
- [ ] `sendDefaultPii: false` present in `Sentry.init` options
- [ ] `tracesSampleRate: 0` present in `Sentry.init` options

### Capture logic
- [ ] `HttpExceptionFilter` calls `Sentry.captureException` for `status >= 500`
- [ ] `HttpExceptionFilter` does NOT call `Sentry.captureException` for `status < 500`
- [ ] Sentry `extra` includes `correlationId`, `method`, `path`, `statusCode`
- [ ] Sentry `extra` does NOT include `userId`, `businessProfileId`, or request body

### Environment
- [ ] `SENTRY_DSN` added to `backend/.env.example` (empty value)
- [ ] `SENTRY_DSN` declared as optional passthrough in `environment.validation.ts`

### Tests
- [ ] `instrument.spec.ts` covers T1, T2, T3
- [ ] `http-exception.filter.spec.ts` covers T4, T5, T6, T7
- [ ] `npm test` passes (all suites green)
- [ ] `npm run typecheck` passes
- [ ] `npm run lint` passes
