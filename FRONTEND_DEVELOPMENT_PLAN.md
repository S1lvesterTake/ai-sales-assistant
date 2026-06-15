# Frontend Development Plan

## Document Control

- Project: AI Sales Assistant for UMKM
- Scope: Frontend MVP
- Status: In progress
- Current part: FE-07 - Product Management
- Next action: Build paginated product listing, URL filters, validated create/edit forms, availability updates, and delete confirmation
- Last updated: 2026-06-14
- Canonical requirements: `PRD_AI_Sales_Assistant_for_UMKM.md`
- Canonical architecture: `CLAUDE.md`
- Agent guardrails: `AGENTS.md`

## Purpose

This file is the execution tracker for frontend development. It must be updated as part of every frontend implementation part.

The frontend is not complete until all parts are marked `COMPLETE`, all quality gates pass, and the final verification section contains evidence.

## Mandatory Progress Protocol

The following process is required for every part:

1. Update this file and mark the selected part `IN_PROGRESS` before changing frontend source files.
2. Implement only the current part and any prerequisite required to complete it safely.
3. Add or update automated tests for the behavior introduced by the part.
4. Run all verification commands listed in that part.
5. Review changed files, failure states, accessibility, responsiveness, security, and performance impact.
6. Record changed files, test evidence, decisions, risks, and remaining work in the part's completion record.
7. Mark the part `COMPLETE` only when every checklist item and acceptance gate passes.
8. In the same plan update, mark the next part `IN_PROGRESS` before starting its implementation.
9. Never mark multiple unfinished parts `IN_PROGRESS` at the same time.
10. If blocked, mark the current part `BLOCKED`, document the exact blocker and evidence, and continue only with a later part that has no dependency on the blocker.

No part may be skipped silently. Any scope change must be recorded in the Decision Log.

## Status Definitions

| Status | Meaning |
|---|---|
| `NOT_STARTED` | No implementation work has started |
| `IN_PROGRESS` | Active implementation part; only one part may have this status |
| `BLOCKED` | Cannot progress because of a documented external dependency |
| `COMPLETE` | Implementation, tests, verification, and documentation are complete |

## Progress Summary

| Part | Name | Status | Depends On | Completion Evidence |
|---|---|---|---|---|
| FE-00 | Project Foundation | `COMPLETE` | None | Lint, typecheck, 3 unit tests, build, Chromium smoke E2E, audit, Docker build and container smoke passed |
| FE-01 | Design System and Application Shell | `COMPLETE` | FE-00 | Lint, typecheck, 9 tests, build, Chromium smoke E2E, desktop/mobile browser QA passed |
| FE-02 | API, Mocking, and Error Foundation | `COMPLETE` | FE-00 | Lint, typecheck, 27 tests, build, 2 Chromium E2E, audit, and browser MSW contract passed |
| FE-03 | Public Landing Page | `COMPLETE` | FE-01, FE-02 | Lint, typecheck, 30 tests, build, 2 landing E2E, and desktop/mobile browser QA passed |
| FE-04 | Public Chatbot | `COMPLETE` | FE-01, FE-02 | Lint, typecheck, 49 tests, build, 6 Chromium E2E, audit, and desktop/mobile browser QA passed |
| FE-05 | Authentication and Route Protection | `COMPLETE` | FE-01, FE-02 | Lint, typecheck, 67 tests, build, 9 Chromium E2E, audit, and desktop/mobile browser QA passed |
| FE-06 | Dashboard Overview | `COMPLETE` | FE-05 | Lint, typecheck, 72 tests, build, 11 Chromium E2E, audit, and desktop/mobile browser QA passed |
| FE-07 | Product Management | `COMPLETE` | FE-05 | Lint, typecheck, 93 tests, build, 12 Chromium E2E, audit, and desktop/mobile browser QA passed |
| FE-08 | FAQ Management | `COMPLETE` | FE-05 | Lint, typecheck, 111 tests, build, 13 Chromium E2E, audit, and desktop/mobile browser QA passed |
| FE-09 | Lead Management | `IN_PROGRESS` | FE-04, FE-05 | Pending |
| FE-10 | Business Settings and Chat Preview | `NOT_STARTED` | FE-05 | Pending |
| FE-11 | Integration and End-to-End Flows | `NOT_STARTED` | FE-03 through FE-10 | Pending |
| FE-12 | Production Hardening and Delivery | `NOT_STARTED` | FE-11 | Pending |

## Locked Frontend Decisions

- Framework: Next.js App Router with TypeScript strict mode.
- Styling: Tailwind CSS and Shadcn UI, using project-owned composition components.
- Rendering: Server Components by default; Client Components only for interaction or browser-only APIs.
- Authentication: JWT must be stored in a secure `HttpOnly` cookie. Do not store JWTs in `localStorage` or client-readable cookies.
- Dashboard data: Fetch on the server where practical. Use Server Actions or same-origin route handlers for authenticated mutations.
- Public chat token: Store only in `sessionStorage`; never place it in a URL, analytics event, error log, or persistent local storage.
- Forms: React Hook Form and Zod for client-side usability; backend validation remains authoritative.
- Pagination, filters, search, and sort: URL search parameters are the source of truth.
- Chat interaction state: A feature-local reducer or hook; no global state dependency for MVP.
- API mocking: MSW with fixtures matching the documented response envelope and DTO contracts.
- Automated tests: Jest, React Testing Library, and Playwright.
- Package manager: npm unless repository setup explicitly establishes another package manager.
- Frontend source must never call an AI provider directly.
- Avoid global state, chart, date, and data-fetching dependencies unless an actual requirement cannot be met cleanly with the selected stack.

## Target Route Map

```text
/
/demo-chat
/chat/[businessSlug]
/login
/dashboard
/dashboard/products
/dashboard/faqs
/dashboard/leads
/dashboard/settings
```

## Target Frontend Structure

```text
frontend/
  app/
    (marketing)/
    chat/[businessSlug]/
    demo-chat/
    login/
    dashboard/
      products/
      faqs/
      leads/
      settings/
    error.tsx
    global-error.tsx
    not-found.tsx
    layout.tsx
  components/
    ui/
    layout/
    marketing/
    chat/
    dashboard/
    products/
    faqs/
    leads/
    settings/
  lib/
    auth/
    validation/
    api-errors.ts
    env.ts
    utils.ts
  services/
    api-client.ts
    auth.service.ts
    business-profile.service.ts
    chat.service.ts
    dashboard.service.ts
    products.service.ts
    faqs.service.ts
    leads.service.ts
    whatsapp.service.ts
  types/
  mocks/
  tests/
  e2e/
  public/
  Dockerfile
  .env.example
  package.json
```

## FE-00 - Project Foundation

**Status:** `COMPLETE`

**Goal:** Create a reproducible, strictly typed, testable Next.js project foundation.

### Implementation Checklist

- [x] Scaffold `frontend/` with Next.js App Router and TypeScript.
- [x] Enable TypeScript strict mode and project path aliases.
- [x] Configure Tailwind CSS and Shadcn UI foundations.
- [x] Configure ESLint without disabling relevant safety rules.
- [x] Add environment validation for `NEXT_PUBLIC_API_BASE_URL` and `NEXT_PUBLIC_DEMO_BUSINESS_SLUG`.
- [x] Add scripts for dev, lint, typecheck, test, test coverage, E2E, and build.
- [x] Configure Jest and React Testing Library.
- [x] Configure Playwright.
- [x] Add `.env.example` without secrets.
- [x] Add multi-stage frontend Dockerfile with standalone Next.js output.
- [x] Add a minimal application smoke test.
- [x] Document frontend setup commands.

### Acceptance Gate

- [x] Development server starts successfully.
- [x] Production build succeeds.
- [x] Typecheck and lint succeed.
- [x] Unit and smoke tests succeed.
- [x] Playwright can start the application and load `/`.
- [x] Docker image builds and starts.

### Verification Commands

```bash
npm run lint
npm run typecheck
npm run test
npm run test:e2e
npm run build
docker build -t ai-sales-assistant-frontend ./frontend
```

### Completion Record

- Completed date: 2026-06-14
- Changed files: `frontend/` Next.js scaffold, package configuration, strict TypeScript, Shadcn foundation, env validation, Jest/RTL, Playwright, Dockerfile, smoke page/tests, and README
- Test evidence: `npm run lint`, `npm run typecheck`, 3 Jest tests, `npm run build`, 1 Chromium Playwright smoke test, `npm audit` with 0 vulnerabilities, Docker image build, and container HTTP smoke test passed
- Decisions: Next.js 16 App Router, Tailwind 4, Shadcn Base Nova, Node 24 Alpine standalone image, Chromium smoke project, PostCSS override to 8.5.15 for the upstream nested dependency advisory
- Risks or follow-up: Root repository and root Docker Compose remain outside FE-00 frontend scope; visual placeholder is intentionally replaced during FE-01/FE-03

## FE-01 - Design System and Application Shell

**Status:** `COMPLETE`

**Goal:** Establish reusable visual primitives and responsive public/dashboard shells.

### Implementation Checklist

- [x] Define color, typography, spacing, radius, focus, and responsive tokens.
- [x] Add button, input, textarea, select, checkbox, switch, badge, card, table, dialog, alert, toast, skeleton, and pagination primitives as needed.
- [x] Add public header and footer.
- [x] Add dashboard sidebar, desktop header, and mobile navigation.
- [x] Add reusable page header, form field, empty state, error state, loading state, and confirmation dialog.
- [x] Ensure keyboard focus visibility and semantic landmarks.
- [x] Verify mobile, tablet, and desktop behavior.
- [x] Add component tests for shared interactive primitives.

### Acceptance Gate

- [x] Shared states are visually consistent.
- [x] Navigation works with keyboard and screen readers.
- [x] No horizontal overflow at supported viewport sizes.
- [x] Components avoid unnecessary client rendering.

### Verification Commands

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

### Completion Record

- Completed date: 2026-06-14
- Changed files: design tokens and global styles; Shadcn UI primitives; public and dashboard layout components; shared state/form/dialog components; route-group shell; Jest and Playwright coverage
- Test evidence: `npm run lint`, `npm run typecheck`, 9 Jest tests, `npm run build`, and 1 Chromium smoke E2E passed; browser QA passed at desktop and 390px mobile with `scrollWidth === clientWidth`
- Decisions: Warm neutral and green UMKM palette; Server Components for static shells; client boundaries limited to navigation, feedback, and dialog interactions; controlled mobile sheets preserve native link semantics
- Risks or follow-up: Dashboard shell is composition-ready and will be mounted after FE-05 route protection; detailed tablet and cross-route visual regression remains part of FE-12

## FE-02 - API, Mocking, and Error Foundation

**Status:** `COMPLETE`

**Goal:** Create typed API boundaries that allow frontend development before the backend is available.

### Implementation Checklist

- [x] Define success, paginated, validation-error, and general-error envelope types.
- [x] Implement separate public and authenticated API clients.
- [x] Add request timeout and safe response parsing.
- [x] Map backend field errors to frontend form fields.
- [x] Prevent tokens and sensitive payloads from appearing in client logs.
- [x] Define DTO-aligned frontend types for auth, public business, chat, dashboard, products, FAQs, leads, and settings.
- [x] Configure MSW for development and automated tests.
- [x] Add deterministic fixtures for Kopi Senja UMKM.
- [x] Cover success, validation, unauthorized, forbidden, not-found, rate-limit, timeout, and unexpected-error responses.
- [x] Ensure mock handlers are excluded from production runtime.

### Acceptance Gate

- [x] UI features can use the same service interfaces with MSW or the real backend.
- [x] Error handling is centralized and user-friendly.
- [x] Paginated responses preserve metadata.
- [x] Mock contracts match the PRD endpoint and response definitions.

### Verification Commands

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

### Completion Record

- Completed date: 2026-06-14
- Changed files: typed API/domain contracts; centralized API error mapping; public/authenticated transport clients; domain service modules; deterministic Kopi Senja fixtures and MSW browser/Node handlers; Jest Fetch polyfills; development instrumentation and MSW E2E
- Test evidence: `npm run lint`, `npm run typecheck`, 27 Jest tests, `npm run build`, 2 Chromium E2E tests, and `npm audit --audit-level=moderate` passed with 0 vulnerabilities
- Decisions: API clients return canonical envelopes; private clients receive JWT only from a server-side caller; public chat tokens use only `X-Chat-Session-Token`; malformed envelopes fail closed; MSW is enabled only in development and deterministic tests
- Risks or follow-up: Fixtures are PRD-derived until FE-11 compares them with live Swagger; browser service worker may require one initial reload before controlling a brand-new context, covered by the deterministic E2E setup

## FE-03 - Public Landing Page

**Status:** `COMPLETE`

**Goal:** Explain the product within 30 seconds and direct visitors to the demo chatbot or dashboard login.

### Implementation Checklist

- [x] Build hero with product value proposition and primary CTA.
- [x] Explain the UMKM problem and solution.
- [x] Add the three-step product workflow.
- [x] Add product feature summary.
- [x] Add Kopi Senja demo business preview.
- [x] Add chatbot and dashboard preview sections.
- [x] Add public WhatsApp CTA with click tracking.
- [x] Add recruiter-focused technical portfolio section.
- [x] Add login, demo chat, Swagger, and repository links where configured.
- [x] Add page metadata, Open Graph metadata, semantic headings, and accessible CTA labels.
- [x] Add responsive and visual-regression-friendly tests.

### Acceptance Gate

- [x] Product purpose is understandable in under 30 seconds.
- [x] Demo chatbot and login are reachable from the page.
- [x] Loading or tracking failure does not block WhatsApp navigation.
- [x] Core content renders without JavaScript where practical.

### Verification Commands

```bash
npm run lint
npm run typecheck
npm run test
npm run test:e2e -- landing
npm run build
```

### Completion Record

- Completed date: 2026-06-14
- Changed files: complete server-rendered landing page, reusable marketing previews and section heading, best-effort WhatsApp tracking link, metadata/Open Graph, repository and Swagger links, responsive unit and Playwright tests
- Test evidence: `npm run lint`, `npm run typecheck`, 30 Jest tests, `npm run build`, and 2 landing Chromium E2E tests passed; browser QA confirmed one H1, seven semantic sections, and no horizontal overflow at 1280px or 390px
- Decisions: Keep primary content server-rendered; isolate tracking to one small Client Component; preserve native WhatsApp navigation even when tracking fails; expose repository URL through validated public environment configuration
- Risks or follow-up: Demo chat and login targets are implemented in FE-04 and FE-05; final screenshots, social image assets, and expanded accessibility audit remain FE-12 scope

## FE-04 - Public Chatbot

**Status:** `COMPLETE`

**Goal:** Deliver the complete public customer chat, lead capture, and WhatsApp handoff flow.

### Implementation Checklist

- [x] Resolve public business data from `businessSlug`.
- [x] Create a chat session and store its token only in `sessionStorage`.
- [x] Restore an active session and load paginated history.
- [x] Render suggested questions, customer messages, assistant messages, and timestamps.
- [x] Generate one stable `clientMessageId` per submitted customer message.
- [x] Handle completed duplicate responses without duplicated UI messages.
- [x] Handle HTTP 202 pending responses without starting parallel submissions.
- [x] Retry network failures using the same `clientMessageId`.
- [x] Handle expired or invalid chat session tokens by offering a new session.
- [x] Add loading, empty, rate-limit, timeout, fallback, and unexpected-error states.
- [x] Add lead capture form when requested by chatbot response state.
- [x] Validate Indonesian name and phone input for usability while preserving backend authority.
- [x] Show WhatsApp CTA when indicated by the response.
- [x] Track WhatsApp click before navigation without blocking the user.
- [x] Add an ARIA live region and keyboard-friendly message composer.
- [x] Prevent duplicate send from rapid clicks or Enter-key repetition.

### Acceptance Gate

- [x] Customer can start a session, send messages, and receive Bahasa Indonesia responses.
- [x] Session token is absent from URL and persistent local storage.
- [x] Duplicate and pending requests do not duplicate visible messages or side effects.
- [x] Lead capture and WhatsApp handoff work.
- [x] Expired session recovery is understandable and safe.

### Verification Commands

```bash
npm run lint
npm run typecheck
npm run test
npm run test:e2e -- chat
npm run build
```

### Completion Record

- Completed date: 2026-06-14
- Changed files: `frontend/app/chat/[businessSlug]/page.tsx`, `frontend/app/demo-chat/page.tsx`, `frontend/components/chat/*`, `frontend/components/marketing/tracked-whatsapp-link.tsx`, `frontend/components/ui/label.tsx`, `frontend/lib/chat-session.ts`, `frontend/lib/validation/phone.ts`, `frontend/services/leads.service.ts`, `frontend/types/lead.ts`, mock fixtures/handlers, package manifests, Jest tests, and `frontend/e2e/chat.spec.ts`
- Test evidence: ESLint and strict TypeScript passed; 49 Jest tests passed; production build passed; all 6 Chromium E2E tests passed, including 2 chat flows; npm audit reported 0 vulnerabilities; in-app browser QA passed at desktop and 390px with no horizontal overflow or console warnings/errors
- Decisions: Keep the raw public token exclusively in per-business `sessionStorage`; use a feature-local reducer and synchronous send lock; poll bounded HTTP 202 responses using the same UUID; normalize Indonesian phone numbers before submission; keep WhatsApp tracking best-effort and native navigation non-blocking
- Risks or follow-up: Live NestJS/Swagger contract verification remains FE-11; the deterministic MSW provider simulates idempotency and fallback but automated tests never invoke a live AI provider

## FE-05 - Authentication and Route Protection

**Status:** `COMPLETE`

**Goal:** Provide secure demo login and protect every dashboard route.

### Implementation Checklist

- [x] Build accessible login form with demo credential helper.
- [x] Submit credentials through a Server Action or same-origin route handler.
- [x] Store JWT in a secure `HttpOnly`, `SameSite=Lax` cookie; enable `Secure` in production.
- [x] Validate the session server-side using the current-user endpoint.
- [x] Protect dashboard layouts and preserve a validated relative return URL.
- [x] Reject open redirects.
- [x] Handle invalid credentials, expired token, backend outage, and logout.
- [x] Redirect authenticated users away from login where appropriate.
- [x] Redirect users without a profile to settings/onboarding.
- [x] Ensure authentication errors do not expose technical details.

### Acceptance Gate

- [x] Unauthenticated users cannot render protected dashboard content.
- [x] JWT is never readable by browser JavaScript.
- [x] Expired sessions return users to login with a clear message.
- [x] Demo login flow works end to end with mocks.

### Verification Commands

```bash
npm run lint
npm run typecheck
npm run test
npm run test:e2e -- auth
npm run build
```

### Completion Record

- Completed date: 2026-06-14
- Changed files: auth Route Handlers, `frontend/proxy.ts`, server-only auth/session utilities, login UI, protected dashboard layouts and placeholders, dashboard shell account/logout integration, server env template, root layout scroll declaration, auth Jest tests, and `frontend/e2e/auth.spec.ts`
- Test evidence: Next route types, ESLint, and strict TypeScript passed; 67 Jest tests passed; production build passed; all 9 Chromium E2E tests passed, including 3 auth security flows; npm audit reported 0 vulnerabilities; in-app browser login/dashboard QA passed on desktop and 390px with no overflow or console warnings/errors
- Decisions: Use same-origin Route Handlers as a backend-for-frontend boundary; store only the raw JWT in a secure HttpOnly cookie; use Next 16 `proxy.ts` for optimistic cookie-presence redirects and server layouts for authoritative `/auth/me` validation; restrict return targets to `/dashboard`; keep no-profile onboarding outside the business-required route group
- Risks or follow-up: Live NestJS auth/profile contract verification and production HTTPS cookie behavior remain FE-11/FE-12 integration gates; mock-only auth tokens are isolated from the client bundle

## FE-06 - Dashboard Overview

**Status:** `COMPLETE`

**Goal:** Present useful business activity without loading unbounded data or adding unnecessary chart dependencies.

### Implementation Checklist

- [x] Add total leads, new leads, total chat sessions, and WhatsApp clicks summary cards.
- [x] Add recent leads.
- [x] Add recent conversations.
- [x] Add most asked questions.
- [x] Add skeleton, empty, partial-error, and full-error states.
- [x] Add retry behavior for recoverable failures.
- [x] Use server rendering for initial dashboard data.
- [x] Keep recent lists bounded and link to detailed pages.
- [x] Add responsive layout and accessible labels for metrics.

### Acceptance Gate

- [x] Dashboard uses real service data rather than hardcoded page data.
- [x] Empty accounts remain useful and understandable.
- [x] One failed widget does not unnecessarily hide successful widgets.
- [x] No chart dependency is added for the MVP.

### Verification Commands

```bash
npm run lint
npm run typecheck
npm run test
npm run test:e2e -- dashboard
npm run build
```

### Completion Record

- Completed date: 2026-06-14
- Changed files: server dashboard loader and result types, dashboard overview/retry components, protected dashboard page/loading UI, dashboard service fixture integration, Jest overview/server-loader tests, auth E2E heading update, and `frontend/e2e/dashboard.spec.ts`
- Test evidence: Next route types, ESLint, and strict TypeScript passed; 72 Jest tests passed; production build passed; all 11 Chromium E2E tests passed, including 2 dashboard flows; npm audit reported 0 vulnerabilities; in-app browser QA passed on desktop and 390px with no overflow or console warnings/errors
- Decisions: Fetch the four aggregate/recent endpoints concurrently on the server; isolate failures with `Promise.allSettled`; cap each displayed activity list at five records; preserve native link semantics for detail navigation; use semantic `dl`, table, lists, and no chart dependency
- Risks or follow-up: Live backend must guarantee fixed bounds and aggregate-query implementation; frontend defensively limits rendered records, while SQL/index verification remains backend and FE-11 scope

## FE-07 - Product Management

**Status:** `COMPLETE`

**Goal:** Allow owners to manage product knowledge used by the chatbot.

### Implementation Checklist

- [x] Add paginated product list.
- [x] Add category and availability filters in URL search parameters.
- [x] Add create and edit forms.
- [x] Add delete confirmation.
- [x] Validate required fields, maximum lengths, and non-negative price.
- [x] Format Indonesian Rupiah consistently.
- [x] Add availability status control.
- [x] Handle empty, no-result, loading, validation, duplicate, and server-error states.
- [x] Use responsive table and mobile card presentation.
- [x] Preserve active filters after mutations where practical.

### Acceptance Gate

- [x] Create, read, update, delete, filter, and paginate flows work.
- [x] Backend field validation appears next to matching form fields.
- [x] Destructive action requires explicit confirmation.
- [x] Mutations do not cause duplicate submissions.

### Verification Commands

```bash
npm run lint
npm run typecheck
npm run test
npm run test:e2e -- products
npm run build
```

### Completion Record

- Completed date: 2026-06-15
- Changed files: Product server page/loading UI; product list, form, actions, validation, query, server loader/store, same-origin mutation routes, session-expiry helper, Rupiah formatter, async confirmation behavior, Jest coverage, and `frontend/e2e/products.spec.ts`
- Test evidence: Next route types, ESLint, and strict TypeScript passed; 93 Jest tests passed with 77.08% statement coverage; production build passed; product E2E and all 12 Chromium E2E tests passed; npm audit reported 0 vulnerabilities; in-app browser QA passed on desktop and 390px with no overflow or console warnings/errors
- Decisions: Keep initial list reads server-rendered; route browser mutations through same-origin BFF handlers; encode category, availability, and page in the URL; use deterministic server-side mock state until backend integration; redirect stale pages to the last valid filtered page after deletions
- Risks or follow-up: Live backend must match the DTO envelope, pagination semantics, field errors, and deterministic ordering during FE-11 Swagger/database integration; exact category matching remains the backend contract for MVP

## FE-08 - FAQ Management

**Status:** `COMPLETE`

**Goal:** Allow owners to maintain active FAQ knowledge for chatbot context.

### Implementation Checklist

- [x] Add paginated FAQ list.
- [x] Add search, category, and active-status filters in URL parameters.
- [x] Add create and edit forms.
- [x] Add enable/disable control.
- [x] Add delete confirmation.
- [x] Validate required fields and maximum lengths.
- [x] Handle empty, no-result, loading, validation, and server-error states.
- [x] Add responsive table and mobile card presentation.

### Acceptance Gate

- [x] Create, read, update, delete, search, filter, and status flows work.
- [x] Active status is clear without relying on color alone.
- [x] Backend validation is mapped to form fields.
- [x] Mutation controls prevent duplicate requests.

### Verification Commands

```bash
npm run lint
npm run typecheck
npm run test
npm run test:e2e -- faqs
npm run build
```

### Completion Record

- Completed date: 2026-06-15
- Changed files: FAQ server page/loading UI; list, form, actions, query, validation, server loader/store, same-origin mutation routes, mock-readiness and hydration utilities, stable Playwright configuration, Jest coverage, and `frontend/e2e/faqs.spec.ts`
- Test evidence: ESLint and strict TypeScript passed; 111 Jest tests passed with 78.91% statement coverage; production build passed; FAQ E2E and two consecutive full 13-test Chromium runs passed; npm audit reported 0 vulnerabilities; in-app browser QA passed on desktop and 390px with no overflow or console warnings/errors
- Decisions: Reuse the server-read/same-origin-mutation architecture from products; search question and answer case-insensitively; keep exact case-insensitive category filtering; disable mutation dialog triggers until hydration; make API clients wait for MSW readiness in development; cap Playwright at two workers and avoid concurrent stateful seed bursts
- Risks or follow-up: Live backend must match FAQ search, pagination, field-error, ownership, and deterministic-ordering contracts during FE-11 integration; only active FAQ inclusion in AI context remains a backend responsibility

## FE-09 - Lead Management

**Status:** `IN_PROGRESS`

**Goal:** Let owners find, understand, update, and follow up captured leads.

### Implementation Checklist

- [ ] Add paginated lead list.
- [ ] Add search and status filters in URL search parameters.
- [ ] Add lead detail panel or page with linked conversation context.
- [ ] Add manual lead creation.
- [ ] Add status update flow for new, contacted, qualified, closed, and lost.
- [ ] Display canonical phone numbers safely and consistently.
- [ ] Add WhatsApp follow-up action.
- [ ] Handle duplicate-phone backend responses without creating duplicate rows.
- [ ] Add empty, no-result, loading, validation, and error states.
- [ ] Ensure private lead data never appears on public routes or page metadata.

### Acceptance Gate

- [ ] Lead list, detail, search, pagination, creation, and status updates work.
- [ ] Duplicate lead behavior is clear and non-destructive.
- [ ] Conversation and WhatsApp actions use only authorized data.
- [ ] Sensitive data is excluded from client logs and analytics.

### Verification Commands

```bash
npm run lint
npm run typecheck
npm run test
npm run test:e2e -- leads
npm run build
```

### Completion Record

- Completed date: Pending
- Changed files: Pending
- Test evidence: Pending
- Decisions: Pending
- Risks or follow-up: Pending

## FE-10 - Business Settings and Chat Preview

**Status:** `NOT_STARTED`

**Goal:** Let owners create or update business context and safely preview the public chatbot.

### Implementation Checklist

- [ ] Add business profile create and update form.
- [ ] Add business name, slug, description, category, WhatsApp, location, operating hours, main offer, and CTA message fields.
- [ ] Validate slug format and explain that slug is immutable after creation.
- [ ] Guide accepted Indonesian phone formats and display canonical result.
- [ ] Disable demo email, credential, slug, and protected identity changes.
- [ ] Never expose `isDemo` as an editable field.
- [ ] Add public chatbot URL with copy and preview actions.
- [ ] Add unsaved-change protection for meaningful edits.
- [ ] Handle loading, validation, conflict, and server-error states.

### Acceptance Gate

- [ ] New owner can create a valid business profile.
- [ ] Existing owner can update permitted fields.
- [ ] Demo protected fields cannot be submitted through the UI.
- [ ] Public preview uses `businessSlug`, not an internal ID.

### Verification Commands

```bash
npm run lint
npm run typecheck
npm run test
npm run test:e2e -- settings
npm run build
```

### Completion Record

- Completed date: Pending
- Changed files: Pending
- Test evidence: Pending
- Decisions: Pending
- Risks or follow-up: Pending

## FE-11 - Integration and End-to-End Flows

**Status:** `NOT_STARTED`

**Goal:** Replace mock assumptions with verified backend contracts and prove primary user journeys.

### Implementation Checklist

- [ ] Compare service types and fixtures with the live Swagger/OpenAPI contract.
- [ ] Resolve every documented contract mismatch explicitly.
- [ ] Run frontend against the real backend and seeded database.
- [ ] Verify public business slug resolution.
- [ ] Verify chat session token creation, expiry, and recovery.
- [ ] Verify pending and completed `clientMessageId` behavior.
- [ ] Verify lead capture appears in the authenticated dashboard.
- [ ] Verify product and FAQ changes affect chatbot responses.
- [ ] Verify WhatsApp click tracking.
- [ ] Verify unauthorized, forbidden, validation, rate-limit, timeout, and provider-fallback behavior.
- [ ] Remove obsolete mock-only assumptions while retaining MSW for deterministic tests.

### Required E2E Scenarios

- [ ] Landing page to demo chat to WhatsApp CTA.
- [ ] Customer product-price question receives a relevant Bahasa Indonesia response.
- [ ] Customer buying intent leads to contact capture and dashboard lead visibility.
- [ ] Owner login, product creation, and chatbot response using the new product.
- [ ] FAQ creation and active-status behavior.
- [ ] Lead status update and WhatsApp follow-up.
- [ ] Token expiration, unauthorized dashboard, and network-failure recovery.

### Acceptance Gate

- [ ] All required E2E scenarios pass against the integrated stack.
- [ ] MSW and real backend use the same frontend service contracts.
- [ ] No live AI provider is called from unit or component tests.
- [ ] No critical contract mismatch remains undocumented.

### Verification Commands

```bash
npm run lint
npm run typecheck
npm run test:coverage
npm run test:e2e
npm run build
```

### Completion Record

- Completed date: Pending
- Changed files: Pending
- Test evidence: Pending
- Decisions: Pending
- Risks or follow-up: Pending

## FE-12 - Production Hardening and Delivery

**Status:** `NOT_STARTED`

**Goal:** Make the frontend deployable, observable, accessible, performant, and portfolio-ready.

### Implementation Checklist

- [ ] Run responsive QA at representative mobile, tablet, laptop, and wide-screen widths.
- [ ] Run keyboard-only and screen-reader-oriented accessibility review.
- [ ] Verify color contrast, focus order, form labels, dialog focus, and live regions.
- [ ] Add route-level, global, and not-found error handling.
- [ ] Verify request timeouts and user-facing retry behavior.
- [ ] Review client bundle and remove unnecessary client components or dependencies.
- [ ] Verify no secret or token can enter the frontend bundle, URL, log, or analytics payload.
- [ ] Add production metadata, favicon, robots, sitemap, and social preview assets.
- [ ] Verify frontend Docker image and root Docker Compose startup.
- [ ] Verify Railway environment configuration and health behavior.
- [ ] Update README with setup, environment, testing, screenshots, demo URL, and credentials.
- [ ] Capture final screenshots for landing, chatbot, dashboard, products, FAQs, leads, and settings.

### Final Acceptance Gate

- [ ] Requirement and Definition of Done checks pass.
- [ ] Lint, typecheck, unit, coverage, E2E, and production build pass.
- [ ] Docker image and full Docker Compose stack start successfully.
- [ ] Core Web Vitals and bundle review show no known critical regression.
- [ ] No critical accessibility issue remains.
- [ ] No sensitive data or credentials are exposed.
- [ ] Documentation and screenshots are complete.

### Verification Commands

```bash
npm run lint
npm run typecheck
npm run test:coverage
npm run test:e2e
npm run build
docker build -t ai-sales-assistant-frontend ./frontend
docker compose up --build
```

### Completion Record

- Completed date: Pending
- Changed files: Pending
- Test evidence: Pending
- Decisions: Pending
- Risks or follow-up: Pending

## Global Quality Gates

These checks apply to every applicable part:

- [ ] Loading, empty, error, and success states are implemented.
- [ ] Forms show field-level and submission-level errors.
- [ ] Interactive controls are keyboard accessible.
- [ ] Responsive behavior is verified.
- [ ] Server and client state responsibilities are explicit.
- [ ] No sensitive token or personal data is logged.
- [ ] No request becomes unbounded.
- [ ] No avoidable duplicate submission exists.
- [ ] Client Components are limited to interactive boundaries.
- [ ] Tests verify behavior rather than implementation details.
- [ ] Build output contains no unexpected secret or mock configuration.

## Backend Dependency Register

| Dependency | Needed By | Frontend Strategy Before Backend Exists | Status |
|---|---|---|---|
| Public business endpoint | FE-03, FE-04 | MSW contract fixture | Mock complete; live backend pending |
| Public chat session and message endpoints | FE-04 | MSW stateful handlers | Mock complete; live backend pending |
| WhatsApp link and click endpoints | FE-03, FE-04 | MSW tracking handler | Mock complete; live backend pending |
| Auth login and current-user endpoints | FE-05 | Same-origin auth mock | Mock complete; live backend pending |
| Dashboard endpoints | FE-06 | MSW aggregate fixtures | Mock complete; live backend pending |
| Product endpoints | FE-07 | Same-origin deterministic CRUD adapter plus service contract | Mock complete; live backend pending |
| FAQ endpoints | FE-08 | Same-origin deterministic CRUD adapter plus service contract | Mock complete; live backend pending |
| Lead endpoints | FE-09 | MSW CRUD and duplicate handler | Pending |
| Business profile endpoints | FE-10 | MSW create/update handlers | Pending |
| Swagger/OpenAPI contract | FE-11 | PRD types until available | Pending |

## Decision Log

| Date | Part | Decision | Reason | Impact |
|---|---|---|---|---|
| 2026-06-14 | Planning | Use Server Components by default | Reduce client bundle and keep data access boundaries clear | Interactive components must be isolated |
| 2026-06-14 | Planning | Keep JWT in `HttpOnly` cookie | Prevent JavaScript token access | Auth calls use server-side boundary |
| 2026-06-14 | Planning | Use MSW for contract-driven parallel frontend work | Backend is not implemented yet | FE-11 must verify all mocks against Swagger |
| 2026-06-14 | Planning | Avoid global state and query libraries for MVP | Current workflows do not justify added complexity | Reconsider only with measured need |
| 2026-06-14 | Planning | No chart dependency for dashboard MVP | Summary cards and bounded lists satisfy PRD | Smaller bundle and simpler accessibility |
| 2026-06-14 | FE-01 | Use controlled mobile sheets around native links | Base UI close composition otherwise changes link semantics or emits accessibility warnings | Mobile navigation closes on selection without losing anchor semantics |
| 2026-06-14 | FE-02 | Resolve global fetch at request time | MSW and runtime adapters must be able to intercept singleton clients after module evaluation | Service clients work identically with mock and real transports |
| 2026-06-14 | FE-02 | Fail closed on malformed API envelopes | Typed compile-time contracts do not protect against invalid network payloads | Invalid success, error, and pagination shapes become user-safe client errors |
| 2026-06-14 | FE-03 | Keep WhatsApp CTA as a native anchor | Tracking must never block or replace the user's navigation intent | Analytics failure is silent and the destination remains available |
| 2026-06-14 | FE-04 | Keep chat identity and retry state feature-local | Public sessions require a raw browser token and stable message UUID without introducing global state | Session data stays in `sessionStorage`; retries reuse the original `clientMessageId` |
| 2026-06-14 | FE-05 | Use a same-origin BFF boundary with optimistic Proxy checks and authoritative server validation | JWT must remain unreadable to browser JavaScript while every protected render still verifies the backend session | Route Handlers own cookie mutation; dashboard layouts call `/auth/me`; redirects accept only dashboard-relative targets |
| 2026-06-14 | FE-06 | Load dashboard widgets concurrently and isolate failures | Aggregate and recent endpoints are independent and one outage must not hide successful business data | `Promise.allSettled` feeds per-widget success/error states; rendered recent lists are capped at five |
| 2026-06-15 | FE-07 | Keep product reads server-rendered and mutations behind same-origin routes | Preserve the HttpOnly JWT boundary while supporting responsive CRUD interactions and URL-addressable filters | Server list loads stay private; create, update, status, and delete requests use validated BFF handlers with session-expiry recovery |
| 2026-06-15 | FE-08 | Gate browser requests on MSW readiness and hydrate mutation triggers explicitly | Development requests and early clicks must not race instrumentation or client hydration | API clients wait for mock startup; form triggers remain disabled until hydrated; stateful E2E runs use bounded parallelism |

## Progress Log

Add one entry whenever a part changes status.

| Date | Part | From | To | Summary | Verification |
|---|---|---|---|---|---|
| 2026-06-14 | Planning | N/A | Ready | Frontend execution plan created | Markdown structure reviewed |
| 2026-06-14 | FE-00 | `NOT_STARTED` | `IN_PROGRESS` | Started project foundation and verified local toolchain | Node 24.15.0, npm 11.12.1, Docker 29.4.3, Compose 5.1.4 |
| 2026-06-14 | FE-00 | `IN_PROGRESS` | `COMPLETE` | Completed reproducible Next.js foundation with tests and standalone Docker image | Lint, typecheck, 3 unit tests, build, Chromium E2E, audit, Docker build and runtime smoke passed |
| 2026-06-14 | FE-01 | `NOT_STARTED` | `IN_PROGRESS` | Started design system and application shell | FE-00 dependency complete |
| 2026-06-14 | FE-01 | `IN_PROGRESS` | `COMPLETE` | Completed reusable design system and responsive public/dashboard shells | Lint, typecheck, 9 tests, build, Chromium E2E, and desktop/mobile browser QA passed |
| 2026-06-14 | FE-02 | `NOT_STARTED` | `IN_PROGRESS` | Started typed API, error handling, fixtures, and MSW foundation | FE-00 dependency complete; FE-01 components available for error states |
| 2026-06-14 | FE-02 | `IN_PROGRESS` | `COMPLETE` | Completed typed API clients, services, error normalization, fixtures, and MSW runtime | Lint, typecheck, 27 tests, build, 2 Chromium E2E, audit, and mock browser contract passed |
| 2026-06-14 | FE-03 | `NOT_STARTED` | `IN_PROGRESS` | Started complete public landing page and conversion flow | FE-01 and FE-02 dependencies complete |
| 2026-06-14 | FE-03 | `IN_PROGRESS` | `COMPLETE` | Completed responsive public landing page, demo previews, portfolio proof, and conversion paths | Lint, typecheck, 30 tests, build, 2 landing E2E, and desktop/mobile browser QA passed |
| 2026-06-14 | FE-04 | `NOT_STARTED` | `IN_PROGRESS` | Activated public chatbot implementation after landing completion | FE-01 and FE-02 dependencies complete |
| 2026-06-14 | FE-04 | `IN_PROGRESS` | `COMPLETE` | Completed public session, idempotent message, lead capture, and WhatsApp handoff flows | Lint, typecheck, 49 tests, build, 6 Chromium E2E, audit, and desktop/mobile browser QA passed |
| 2026-06-14 | FE-05 | `NOT_STARTED` | `IN_PROGRESS` | Started secure authentication and dashboard route protection | FE-01 and FE-02 dependencies complete; FE-04 public flow complete |
| 2026-06-14 | FE-05 | `IN_PROGRESS` | `COMPLETE` | Completed secure login, HttpOnly session, server validation, route protection, expiry recovery, onboarding, and logout | Lint, typecheck, 67 tests, build, 9 Chromium E2E, audit, and desktop/mobile browser QA passed |
| 2026-06-14 | FE-06 | `NOT_STARTED` | `IN_PROGRESS` | Started server-rendered dashboard overview and bounded activity sections | FE-05 authentication and protected shell complete |
| 2026-06-14 | FE-06 | `IN_PROGRESS` | `COMPLETE` | Completed aggregate metrics, bounded recent activity, empty/loading/error states, and responsive overview | Lint, typecheck, 72 tests, build, 11 Chromium E2E, audit, and desktop/mobile browser QA passed |
| 2026-06-14 | FE-07 | `NOT_STARTED` | `IN_PROGRESS` | Started complete product knowledge management flow | FE-05 authentication and dashboard shell complete |
| 2026-06-15 | FE-07 | `IN_PROGRESS` | `COMPLETE` | Completed responsive product CRUD, URL filters, pagination, availability, validation, confirmation, and recovery states | Lint, typecheck, 93 Jest tests, build, 12 Chromium E2E, audit, and desktop/mobile browser QA passed |
| 2026-06-15 | FE-08 | `NOT_STARTED` | `IN_PROGRESS` | Activated FAQ knowledge management after product management completion | FE-05 authentication and FE-07 dashboard CRUD patterns complete |
| 2026-06-15 | FE-08 | `IN_PROGRESS` | `COMPLETE` | Completed responsive FAQ CRUD, search, filters, pagination, status, validation, confirmation, and recovery states | Lint, typecheck, 111 Jest tests, build, two consecutive 13-test Chromium runs, audit, and desktop/mobile browser QA passed |
| 2026-06-15 | FE-09 | `NOT_STARTED` | `IN_PROGRESS` | Activated lead management after FAQ knowledge management completion | FE-04 lead capture and FE-05 authenticated dashboard dependencies complete |

## Final Verification Record

- Final completion date: Pending
- Completed parts: 9 / 13
- Unit coverage: Latest gate passed with 111 Jest tests and 78.91% statement coverage
- Critical-flow coverage: Public, auth, dashboard, product, and FAQ CRUD/search/filter/pagination flows plus empty, validation, failure, retry, confirmation, hydration, and mobile states covered
- E2E result: Latest gate passed twice consecutively with 13 Chromium tests
- Production build: Latest gate passed
- Docker build: Pending
- Docker Compose: Pending
- Accessibility review: FE-00 through FE-08 reviewed; final audit pending FE-12
- Responsive review: FE-00 through FE-08 passed desktop/mobile browser QA; full route matrix pending FE-12
- Security review: Public token boundaries, HttpOnly JWT storage, same-origin product/FAQ mutations, safe redirects, session-expiry recovery, and authoritative dashboard session validation reviewed
- Performance review: Bounded history/polling, concurrent aggregate dashboard loading, bounded product/FAQ pagination, bounded E2E concurrency, and responsive conditional presentation reviewed; final bundle review pending FE-12
- Remaining risks: Live backend contract and full Docker Compose integration remain pending FE-11/FE-12
