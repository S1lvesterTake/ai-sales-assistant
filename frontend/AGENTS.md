# Frontend AGENTS.md

## Stack

- Next.js **16.2.9** — APIs, file conventions, and routing differ from earlier versions and from training data.
  **Before writing any Next.js-specific code, read the relevant guide in `node_modules/next/dist/docs/`.**
- Output mode: `standalone` (configured in `next.config.ts`).
- Styling: Tailwind CSS + Shadcn UI components (`components/ui/`).
- Validation: Zod schemas in `lib/*/validation.ts`.
- API mocking: MSW — enabled via `NEXT_PUBLIC_API_MOCKING=enabled`, handlers in `mocks/handlers.ts`.

## Architectural Constraints

- **NEVER** call the backend AI provider directly from the frontend. All AI interactions go through the Next.js BFF routes or the NestJS backend API.
- **NEVER** import server-only modules (`next/headers`, `cookies()`, `server-only`) in Client Components (`'use client'`).
- **NEVER** put business logic inside a Server Component. Server Components fetch data; Client Components handle interaction.
- **NEVER** read `process.env.NEXT_PUBLIC_*` in a Server Component at runtime — these are baked at build time. Use them only for client-accessible values.
- **ALWAYS** use `API_BASE_URL` (server-side) for SSR/BFF calls to the backend, and `NEXT_PUBLIC_API_BASE_URL` for client-side fetch. These are different env vars pointing to different network paths on Railway.

## Forbidden Patterns

### Raw `fetch` to backend from Client Component
❌ `fetch(process.env.NEXT_PUBLIC_API_BASE_URL + '/api/auth/login', { body: ... })` in a component
✅ `fetch('/api/auth/login', ...)` — always proxy through the Next.js BFF route layer (`app/api/`)

### Unvalidated env at startup
❌ Assuming `process.env.NEXT_PUBLIC_API_BASE_URL` is set
✅ `lib/env.ts` validates all `NEXT_PUBLIC_*` vars via Zod at build time — add new vars there, not inline

### Client Component reading cookies directly
❌ `document.cookie` or `js-cookie` for the auth token
✅ Auth cookie is `httpOnly`; only Server Components and Route Handlers read it via `next/headers`

## Auth Cookie Rules

- Cookie name: `AUTH_COOKIE_NAME` from `lib/auth/constants.ts`
- Set in `app/api/auth/login/route.ts` only
- `httpOnly: true`, `secure: true` in production (`NODE_ENV === 'production'`)
- Never read from client-side JS — always derive auth state server-side

## Environment Variables

| Variable | Where set | Used by |
|---|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | Build ARG + Runtime | Client-side fetch, baked at build |
| `API_BASE_URL` | Runtime only | Server Components / BFF → backend (Railway private network) |
| `NEXT_PUBLIC_DEMO_BUSINESS_SLUG` | Build ARG + Runtime | Landing page, demo links |
| `NEXT_PUBLIC_API_MOCKING` | Build ARG + Runtime | MSW toggle |

## Tool Usage Rules

- Read the target file before editing any component or utility.
- When adding a new page, check if a `loading.tsx` skeleton is needed alongside it.
- MSW handlers in `mocks/handlers.ts` must be updated in sync with any BFF route change.
- Before adding a Shadcn component, check `components/ui/` — it may already exist.
