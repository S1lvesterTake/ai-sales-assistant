# Backend Development Plan

## Document Control

- Project: AI Sales Assistant for UMKM
- Scope: Standalone backend MVP
- Status: Ready for execution
- Current part: BE-11 - Standalone Hardening and Delivery
- First implementation part: BE-00 - Backend Project Foundation
- Last updated: 2026-06-15
- Canonical requirements: PRD_AI_Sales_Assistant_for_UMKM.md
- Canonical architecture: CLAUDE.md
- Frontend contract reference: FRONTEND_DEVELOPMENT_PLAN.md and frontend/services plus frontend/types
- Agent guardrails: AGENTS.md

## Purpose

This file is the execution tracker for building the NestJS backend from an empty backend directory through a production-ready standalone API.

The plan intentionally does not integrate the backend with the Next.js frontend. Frontend service changes, removal of MSW assumptions, full-stack Playwright, and root full-stack Docker Compose verification remain deferred until the standalone backend has completed every backend quality gate.

## Understanding

The backend must provide a secure, documented, testable API for:

- JWT authentication and one business profile per user.
- Public business lookup by immutable business slug.
- Ownership-scoped product, FAQ, lead, dashboard, and conversation access.
- Public chat sessions protected by an opaque expiring token whose SHA-256 hash is stored.
- Idempotent chat processing using clientMessageId, processing claims, and stored assistant replies.
- OpenAI behind a replaceable provider interface, with a deterministic fake provider for tests.
- Lead capture with canonical Indonesian phone numbers and database-backed duplicate prevention.
- WhatsApp link generation and click tracking.
- PostgreSQL schema and migrations using Drizzle ORM and Drizzle Kit.
- Swagger, centralized validation and errors, structured logs, Docker, demo seed/reset, and comprehensive tests.

## Current Repository Findings

- The repository currently contains a mature frontend but no backend directory.
- The frontend is on FE-10. FE-11 integration has not started.
- Frontend API clients already use the PRD endpoint paths and standard response envelopes.
- Frontend authentication expects login to return accessToken, expiresAt, and user; the frontend stores the JWT in an HttpOnly cookie through its own same-origin route handler.
- Frontend public chat stores the raw chat token only in sessionStorage and sends it through X-Chat-Session-Token.
- Frontend list pages expect camelCase JSON, deterministic pagination metadata, and field-level validation errors.
- The backend must be developed and tested independently before any frontend mock or service is changed.

## Related Files

- PRD_AI_Sales_Assistant_for_UMKM.md
- CLAUDE.md
- AGENTS.md
- FRONTEND_DEVELOPMENT_PLAN.md
- frontend/types/
- frontend/services/
- frontend/mocks/fixtures.ts
- frontend/mocks/handlers.ts

## Existing Patterns to Preserve

- JSON properties use camelCase while database columns use snake_case.
- API responses use success, message, data, optional meta, or errors.
- Public routes use businessSlug and never expose internal ownership identifiers.
- Authenticated frontend calls send a Bearer JWT from server-side code.
- Public chat calls send X-Chat-Session-Token.
- Pagination state uses page and limit.
- Owner-facing lists sort by createdAt descending and id descending.
- Chat history sorts by createdAt ascending and id ascending.
- Delete operations return a successful envelope with data set to null.
- HTTP 202 is used for an active duplicate chat request that is still pending.

## Scope Boundary

Included:

- New backend directory and NestJS application.
- Backend Dockerfile.
- PostgreSQL and Drizzle schema, migrations, repositories, and tests.
- All PRD backend modules and endpoints.
- Swagger/OpenAPI contract.
- Idempotent demo seed and guarded demo reset commands.
- Standalone backend unit, integration, API E2E, migration, performance, security, and container verification.

Excluded until a separate integration task:

- Editing frontend source, services, types, mocks, or FRONTEND_DEVELOPMENT_PLAN.md.
- Pointing the frontend at the live backend.
- Removing or changing MSW.
- Full-stack Playwright tests.
- Root Docker Compose wiring that starts frontend, backend, and PostgreSQL together.
- Railway frontend/backend cross-service configuration.

## Mandatory Progress Protocol

1. Mark exactly one backend part IN_PROGRESS before editing backend source files.
2. Read the referenced PRD sections and this plan before implementing the part.
3. Implement the complete part, including tests, migrations, Swagger, error behavior, and documentation.
4. Run every verification command listed for the part.
5. Review security, ownership, concurrency, query bounds, logs, and failure behavior.
6. Record changed files, test evidence, decisions, risks, and follow-up in the completion record.
7. Mark the part COMPLETE only when every checklist item and acceptance gate passes.
8. Activate the next dependency-ready part in the same plan update.
9. Do not start frontend integration while any BE part is incomplete.
10. A blocked part must contain the exact blocker and evidence; unrelated backend work may continue only when it has no dependency on the blocker.

## Status Definitions

| Status | Meaning |
|---|---|
| NOT_STARTED | No implementation work has started |
| IN_PROGRESS | Active implementation part; only one part may have this status |
| BLOCKED | Progress requires an external dependency or unavailable environment |
| COMPLETE | Implementation, tests, verification, and documentation are complete |

## Progress Summary

| Part | Name | Status | Depends On | Primary Evidence |
|---|---|---|---|---|
| BE-00 | Backend Project Foundation | COMPLETE | None | Build, lint, typecheck, health smoke, backend image build |
| BE-01 | HTTP, Configuration, Logging, and Swagger Foundation | COMPLETE | BE-00 | Global behavior and API contract tests |
| BE-02 | PostgreSQL Schema, Migrations, and Database Layer | COMPLETE | BE-00 | Empty-database migration and constraint tests |
| BE-03 | Authentication and Ownership Foundation | COMPLETE | BE-01, BE-02 | Auth API and cross-owner foundation tests |
| BE-04 | Business Profile and Demo Operations | COMPLETE | BE-03 | Private/public profile, seed, and reset tests |
| BE-05 | Product and FAQ Knowledge Management | COMPLETE | BE-04 | Ownership-scoped CRUD and pagination tests |
| BE-06 | Public Chat Session Security | COMPLETE | BE-02, BE-04 | Token, expiry, history, and rate-limit tests |
| BE-07 | AI Provider and Idempotent Chat Processing | COMPLETE | BE-05, BE-06 | Concurrency, stale claim, fallback, and fake-provider tests |
| BE-08 | Lead Capture and Management | COMPLETE | BE-04, BE-06, BE-07 | Phone, duplicate, ownership, and chat-link tests |
| BE-09 | WhatsApp Link and Click Tracking | COMPLETE | BE-04, BE-06 | Relation authorization and URL tests |
| BE-10 | Dashboard and Owner Conversation Reads | COMPLETE | BE-07, BE-08, BE-09 | Aggregate SQL, bounded lists, ownership tests |
| BE-11 | Standalone Hardening and Delivery | IN_PROGRESS | BE-00 through BE-10 | Full backend gates, EXPLAIN, migration, image startup |

## Locked Backend Decisions

### API and Serialization

- Global API prefix is /api.
- Swagger UI is available at /api/docs.
- JSON uses camelCase; Drizzle schema uses snake_case.
- Timestamps are returned as ISO 8601 UTC strings.
- UUIDs are used for persisted entity identifiers.
- Validation errors return field-level errors in the standard error envelope.
- Pagination defaults to page 1 and limit 20, with a hard maximum of 100.
- Product, FAQ, lead, and history endpoints return paginated envelopes.
- Dashboard widget endpoints return bounded arrays with a limit query, default 5 and maximum 20, because they are aggregate widgets rather than general collection APIs.
- Invalid pagination is rejected; it never becomes an unbounded query.

### Authentication and Ownership

- JWT payload uses sub as the user UUID. Ownership is resolved from the database, not selected from DTO input.
- Private DTOs never accept userId, businessProfileId, or isDemo.
- Every private resource query includes both resource ID and authenticated business profile ID.
- Cross-owner access returns 404 to avoid resource enumeration.
- Passwords use bcrypt with cost 12.
- JWT secret validation requires a strong non-default secret and JWT expiry is configurable.
- The backend returns the JWT in the login response. Cookie storage remains the frontend BFF responsibility.

### Public Identity and Tokens

- Public routes resolve a business only from businessSlug.
- Slugs are lowercase, URL-safe, unique, maximum 100 characters, and immutable after profile creation.
- Chat session tokens contain 32 random bytes encoded as base64url.
- Only SHA-256 token hashes are stored.
- Default chat session TTL is 24 hours and remains configurable.
- Tokens and JWTs are excluded from logs, error metadata, and database error logs.

### Phone Numbers and Leads

- One shared phone normalization utility handles business WhatsApp, chat customer phone, leads, duplicate checks, and WhatsApp URLs.
- Accepted inputs are 08..., 628..., and +628... after spaces and separators are removed.
- Stored format is 62... and must match ^62[0-9]{8,13}$.
- The unique database constraint on business_profile_id and phone is the final duplicate guard.
- POST /api/leads supports exactly one of two authorization modes:
  - Bearer JWT for manual owner creation; ownership comes from the JWT.
  - X-Chat-Session-Token plus required chatSessionId for public lead capture; ownership comes from the authorized session.
- Requests with both authorization modes, neither mode, or mismatched session context are rejected.
- A lead row is created only after a valid phone number has been collected.

### Chat Idempotency and Transactions

- Customer messages require a UUID clientMessageId.
- Customer message insertion or claim is atomic.
- The customer message is committed before the AI call.
- No database transaction remains open during an external provider call.
- Active duplicate requests return HTTP 202 and do not call the provider.
- Completed duplicate requests return the stored response with HTTP 200.
- Default stale-claim threshold is 30 seconds and remains configurable.
- Provider success or fallback is persisted with the assistant response and any validated lead side effect in one transaction.
- Assistant responses have a unique replyToMessageId.
- Failed is used only when no assistant response was persisted.
- Database writes remain idempotent even when a stale retry repeats an external provider call.

### AI Behavior

- AI provider access is backend-only.
- Chat and domain modules depend on an internal AI provider interface, not provider SDK types.
- OpenAI is the only production MVP adapter.
- Automated tests use a deterministic fake provider and never require a live API key.
- Provider timeout defaults to 8 seconds to preserve the under-10-second chat target.
- Prompt context includes public business fields, at most 20 available products, at most 20 active FAQs, and the current customer message.
- Product and FAQ selection is keyword-aware and deterministically bounded.
- The fallback response is persisted as a completed assistant response.
- Full prompts, raw provider payloads, and provider errors are never logged.

### Database Integrity

- PostgreSQL is used in integration tests; SQLite substitutes are not allowed.
- All foreign-key nullability and delete actions are explicit.
- User to business profile is one-to-one and protected by a unique constraint.
- Business-owned records cannot silently change ownership.
- Chat session deletion may cascade to chat messages.
- Lead chat session references use SET NULL so leads survive chat-history removal.
- WhatsApp event optional lead and session references use SET NULL.
- Parent business and user deletion is restricted for the MVP because no destructive owner-deletion workflow is specified.
- Enum-like status and role values are protected by PostgreSQL checks or enum types.
- Price has a nonnegative database check in addition to DTO validation.

### Logging, Security, and Rate Limits

- Every request gets or receives a correlation ID.
- Structured stdout/stderr logs are authoritative.
- Error log database writes are sanitized, best-effort, and unable to recursively fail the request.
- CORS permits only configured frontend origins.
- Public session creation defaults to 10 requests per minute per IP.
- Public message sending defaults to 20 requests per minute per IP.
- WhatsApp tracking defaults to 60 requests per minute per IP.
- Rate limits are configurable and covered by tests.
- Request logs never contain passwords, authorization headers, chat tokens, full prompts, or raw phone numbers.

## Planned API Contract

| Method | Path | Authorization | Response |
|---|---|---|---|
| POST | /api/auth/register | Public | Auth session envelope |
| POST | /api/auth/login | Public | Auth session envelope |
| GET | /api/auth/me | Bearer JWT | Current user envelope |
| POST | /api/business-profile | Bearer JWT | Business profile envelope |
| GET | /api/business-profile | Bearer JWT | Business profile envelope |
| PATCH | /api/business-profile | Bearer JWT | Business profile envelope |
| GET | /api/public/businesses/:businessSlug | Public | Public business envelope |
| POST | /api/products | Bearer JWT | Product envelope |
| GET | /api/products | Bearer JWT | Paginated products |
| GET | /api/products/:id | Bearer JWT | Product envelope |
| PATCH | /api/products/:id | Bearer JWT | Product envelope |
| DELETE | /api/products/:id | Bearer JWT | Null data envelope |
| POST | /api/faqs | Bearer JWT | FAQ envelope |
| GET | /api/faqs | Bearer JWT | Paginated FAQs |
| GET | /api/faqs/:id | Bearer JWT | FAQ envelope |
| PATCH | /api/faqs/:id | Bearer JWT | FAQ envelope |
| DELETE | /api/faqs/:id | Bearer JWT | Null data envelope |
| POST | /api/public/businesses/:businessSlug/chat/sessions | Public | Session ID, raw token, expiry |
| POST | /api/public/businesses/:businessSlug/chat/sessions/:sessionId/messages | Chat token | Completed or pending chat reply |
| GET | /api/public/businesses/:businessSlug/chat/sessions/:sessionId/messages | Chat token | Paginated chat history |
| POST | /api/leads | JWT or chat token, never anonymous | Lead envelope |
| GET | /api/leads | Bearer JWT | Paginated leads |
| GET | /api/leads/:id | Bearer JWT | Lead envelope |
| PATCH | /api/leads/:id/status | Bearer JWT | Lead envelope |
| GET | /api/dashboard/summary | Bearer JWT | Aggregate summary |
| GET | /api/dashboard/recent-leads | Bearer JWT | Bounded lead array |
| GET | /api/dashboard/recent-conversations | Bearer JWT | Bounded conversation array |
| GET | /api/dashboard/top-questions | Bearer JWT | Bounded question array |
| GET | /api/dashboard/conversations/:sessionId/messages | Bearer JWT | Paginated owner conversation history |
| GET | /api/public/businesses/:businessSlug/whatsapp/link | Public or contextual chat token | WhatsApp link envelope |
| POST | /api/public/businesses/:businessSlug/whatsapp-clicks | Public or contextual chat token | Click event envelope |
| GET | /api/health | Public | Application and database health |

## Contract Notes for Later Frontend Integration

- PublicBusiness includes suggestedQuestions. The backend derives up to three deterministic questions from active FAQs and available products.
- Auth login and register return accessToken, expiresAt, and user to match the existing server-side frontend BFF.
- Current-user response remains separate from business-profile response.
- Product names are not globally or per-business unique because the canonical schema does not require that constraint. Any mock-only duplicate-name assumption must be reconciled during FE-11.
- Dashboard widget arrays are bounded server-side even though they are not paginated envelopes.
- The owner conversation endpoint is added to safely support linked lead conversation context without exposing public session tokens.
- No frontend contract is changed during backend implementation.

## Target Backend Structure

    backend/
      src/
        main.ts
        app.module.ts
        config/
        common/
          decorators/
          dto/
          exceptions/
          filters/
          guards/
          interceptors/
          middleware/
          utils/
        database/
          database.module.ts
          database.service.ts
          schema/
          migrations/
          seeds/
        modules/
          auth/
          business-profile/
          products/
          faqs/
          chat/
          leads/
          dashboard/
          ai/
          whatsapp/
          health/
          error-log/
      test/
        fixtures/
        helpers/
        integration/
        e2e/
      Dockerfile
      drizzle.config.ts
      package.json
      tsconfig.json
      .env.example
      README.md

## BE-00 - Backend Project Foundation

Status: COMPLETE

Goal: Create a reproducible NestJS backend that builds, tests, starts, and exposes a basic health endpoint without depending on the frontend.

### Implementation Checklist

- Create backend with NestJS and TypeScript strict mode.
- Establish npm scripts for build, start, lint, typecheck, unit, coverage, integration, E2E, and Drizzle operations.
- Add configuration loading and startup-time environment validation.
- Add AppModule and HealthModule.
- Add GET /api/health with application status and database status placeholder.
- Add Jest and Supertest foundations.
- Add backend .env.example.
- Add a multi-stage backend Dockerfile that runs the compiled application as a non-root user.
- Add backend README with standalone commands.
- Pin Node and npm expectations consistently with the repository.

### Acceptance Gate

- Fresh npm install succeeds.
- Lint, typecheck, unit smoke test, and build pass.
- The API starts without the frontend.
- GET /api/health returns the standard envelope.
- Backend Docker image builds and starts.
- No secrets or generated build output are committed.

### Verification Commands

    cd backend
    npm ci
    npm run lint
    npm run typecheck
    npm test
    npm run build
    docker build -t ai-sales-assistant-backend .

### Completion Record

- Completed date: 2026-06-15
- Changed files: NestJS backend scaffold, strict bootstrap environment validation, health module, unit and Supertest E2E foundations, CI-safe scripts, backend environment template, Docker ignore and multi-stage non-root Dockerfile, backend README, root ignores, and this tracker
- Test evidence: ESLint passed with zero warnings; strict TypeScript passed; 8 unit tests passed; 1 Supertest E2E passed; production build passed; Docker image built with 0 npm vulnerabilities; container ran as user node and returned the standard health envelope from /api/health
- Decisions: Use Node 24 and npm 11 consistently with the repository; listen on port 3001 by default; keep the BE-00 health response explicitly wrapped until the global response interceptor lands in BE-01
- Risks or follow-up: Database health remains not_configured until BE-02; Swagger, centralized validation, correlation IDs, structured logs, CORS, and throttling are BE-01 scope

## BE-01 - HTTP, Configuration, Logging, and Swagger Foundation

Status: COMPLETE

Goal: Establish consistent transport behavior before feature modules are implemented.

### Implementation Checklist

- Configure the /api global prefix.
- Register a strict global ValidationPipe with transform and whitelist behavior.
- Reject unknown DTO properties.
- Add standard success and paginated response DTOs.
- Add a response interceptor without double-wrapping already formatted responses.
- Add a centralized exception filter for validation, auth, not found, conflict, rate limit, and unexpected errors.
- Add correlation ID middleware and response header.
- Add structured request/error logging with duration and safe error code.
- Add sanitized best-effort ErrorLogService interface.
- Configure CORS from FRONTEND_URL.
- Configure global and route-specific throttling.
- Configure Swagger title, version, groups, bearer auth, headers, examples, and common errors.
- Add configuration namespaces for app, database, JWT, AI, chat, demo, CORS, and rate limits.

### Acceptance Gate

- Swagger opens at /api/docs.
- Validation errors use the canonical error envelope with field names.
- Unknown fields are rejected.
- Success and paginated envelopes are stable.
- Correlation IDs appear in responses and structured logs.
- Sensitive headers and bodies are absent from logs.
- Rate-limit responses use HTTP 429 and the canonical envelope.

### Test Plan

- Unit-test response wrapping and error mapping.
- Supertest malformed JSON, invalid DTO, unknown field, 404, and rate-limit cases.
- Verify Swagger JSON contains bearer auth, chat token header, request schemas, and response schemas.
- Verify logs redact credentials and tokens.

### Completion Record

- Completed date: 2026-06-15
- Changed files: Global app configurator, environment validation, CORS, early correlation and security middleware, JSON parser limits, request logging, structured logger, standard response interceptor, centralized exception filter, validation flattening, pagination and response DTOs, Swagger/OpenAPI setup, throttling guard, error-log abstraction, health Swagger DTO, transport E2E coverage, environment template, and package manifests
- Test evidence: ESLint and strict TypeScript passed; 14 unit tests passed; 7 Supertest E2E tests passed across health, Swagger, success envelopes, field validation, unknown-property rejection, malformed JSON sanitization, CORS, security headers, correlation IDs, and HTTP 429 behavior; production build passed; npm audit reported 0 vulnerabilities
- Decisions: Use HTTP 422 for DTO validation, HTTP 400 for malformed JSON, default global limit 100 requests per 60 seconds, configurable comma-separated frontend origins, 1 MB request-body limit, and stack traces only for 5xx logs
- Risks or follow-up: ErrorLogService remains best-effort no-op until database persistence is added; module-specific Swagger examples and auth requirements are added with each feature module

## BE-02 - PostgreSQL Schema, Migrations, and Database Layer

Status: COMPLETE

Goal: Implement the complete data model, constraints, indexes, migrations, and database access foundation before business modules.

### Implementation Checklist

- Configure Drizzle ORM, Drizzle Kit, and PostgreSQL connection pooling.
- Create all nine schema files and schema index exports.
- Add UUID defaults, timestamps, checks, unique constraints, partial unique index, and composite indexes.
- Declare every foreign key nullability and delete action explicitly.
- Implement DatabaseModule and DatabaseService with graceful shutdown.
- Generate the initial SQL migration.
- Add migration scripts and a test database helper.
- Add transaction helpers without leaking Drizzle into controllers.
- Add repository test utilities and deterministic clocks/UUIDs where needed.
- Verify generated SQL for all required indexes and constraints.

### Required Schema Verification

- Unique business_profiles.slug.
- Unique business_profiles.user_id.
- Unique leads on business_profile_id and phone.
- Unique chat_messages on chat_session_id and client_message_id.
- Unique non-null chat_messages.reply_to_message_id.
- All PRD section 24.4 composite indexes.
- Nonnegative product price.
- Allowed chat roles, processing statuses, and lead statuses.
- Explicit cascade, restrict, and set-null behavior.

### Acceptance Gate

- Migration applies successfully to an empty PostgreSQL database.
- Migration can be rerun safely through the migration runner.
- Constraint tests fail invalid direct SQL writes.
- The application detects unavailable database state without crashing recursively.
- Generated SQL matches the intended ordering and filter patterns.

### Verification Commands

    cd backend
    npm run db:generate
    npm run db:migrate
    npm run test:integration -- database
    npm run build

### Completion Record

- Completed date: 2026-06-15
- Changed files: Drizzle config and scripts; PostgreSQL environment validation; DatabaseModule and pooled DatabaseService; nine Drizzle schema files; generated SQL migration and metadata; explicit enums, checks, unique constraints, foreign keys, delete behavior, and composite indexes; database-backed health state; best-effort error log persistence; disposable PostgreSQL integration harness; database README instructions; package manifests
- Test evidence: ESLint and strict TypeScript passed; 19 unit tests passed; 7 HTTP E2E tests passed; 5 PostgreSQL 16 integration tests passed after applying the empty-database migration twice; tests verified nine tables, required indexes, one-profile-per-user, slug/phone/price checks, lead uniqueness, clientMessageId uniqueness, same-session reply constraints, unique assistant replies, cascade and set-null behavior, DatabaseService ping and shutdown; production build and backend Docker image passed; npm audit reported 0 vulnerabilities
- Decisions: Use PostgreSQL enums for chat roles, processing status, and lead status; use a composite unique constraint before the same-session reply foreign key; use a disposable Docker PostgreSQL harness instead of SQLite or mocks; keep database error logs supplemental and swallow persistence failures
- Risks or follow-up: Lead/session same-business relationships still require ownership-scoped transactional validation in services where SET NULL delete behavior prevents a composite foreign key; query-plan verification remains BE-10 and BE-11 scope

## BE-03 - Authentication and Ownership Foundation

Status: COMPLETE

Goal: Implement secure JWT authentication and the ownership context required by every private module.

### Implementation Checklist

- Implement RegisterDto, LoginDto, AuthResponseDto, and CurrentUserResponseDto.
- Normalize email casing and enforce unique email.
- Hash passwords with bcrypt cost 12.
- Implement register, login, and current-user endpoints.
- Configure Passport JWT strategy and JwtAuthGuard.
- Add CurrentUser decorator and authenticated principal type.
- Add a reusable current-business resolver that queries by JWT user ID.
- Prevent isDemo from entering any public DTO.
- Return generic invalid-credential errors.
- Sanitize authentication logs.
- Document bearer auth in Swagger.

### Acceptance Gate

- Registration stores only password hashes.
- Login returns a signed expiring JWT and expected frontend-compatible shape.
- Invalid credentials return 401 without account enumeration.
- Protected endpoints reject missing, malformed, and expired tokens.
- DTO payloads cannot set demo flags or select ownership.
- Ownership context is derived from the JWT user.

### Test Plan

- Register happy path, duplicate email, invalid email, weak or oversized input.
- Login happy path, wrong password, unknown user, and expired JWT.
- Current-user endpoint with valid, missing, malformed, and expired JWT.
- Direct payload attempt to set isDemo, userId, or businessProfileId.
- Password hash verification without exposing the hash in API responses.

### Completion Record

- Completed date: 2026-06-15
- Changed files: JWT and bcrypt dependencies; JWT environment validation and examples; AuthModule, controller, service, repository, strategy, guard, decorator, DTOs, and authenticated principal type; reusable business ownership resolver; application module registration; auth unit and PostgreSQL integration tests; shared disposable PostgreSQL test helper
- Test evidence: ESLint and strict TypeScript passed; 25 unit tests passed; 7 HTTP E2E tests passed; 13 PostgreSQL integration tests passed; integration coverage verified registration, bcrypt hashes, normalized email, duplicate email, validation boundaries, protected-field rejection, generic invalid credentials, valid/missing/malformed/expired JWTs, current-user responses, and user-derived business ownership; production build passed; npm audit reported 0 vulnerabilities
- Decisions: Use bcrypt cost 12; issue expiring bearer JWTs with user UUID in sub; re-read the user in the JWT strategy; perform a dummy bcrypt comparison for unknown accounts; force isDemo false in repository writes; resolve business ownership only through business_profiles.user_id
- Risks or follow-up: JWT revocation is outside MVP scope; private business endpoints must consistently use BusinessOwnershipService and resource-plus-owner predicates; demo identity protection and one-profile concurrency handling continue in BE-04

## BE-04 - Business Profile and Demo Operations

Status: IN_PROGRESS

Goal: Implement one-business-per-user profile management, public slug resolution, phone normalization, and deterministic demo recovery.

### Implementation Checklist

- Implement shared Indonesian phone normalization and validation.
- Implement private create, get, and update profile endpoints.
- Enforce one profile per user in service and database.
- Enforce slug uniqueness and immutability.
- Implement public business lookup by slug with a public-only response projection.
- Derive up to three suggested questions from active public knowledge.
- Protect demo email, password, slug, business name, and core identity fields.
- Implement idempotent demo seed using the documented Kopi Senja identity and frontend demo credentials.
- Implement transactional guarded demo reset.
- Refuse reset without an explicit environment guard.
- Ensure startup never silently resets production data.

### Acceptance Gate

- Private profile CRUD uses JWT-derived ownership.
- Public response excludes internal IDs, user data, credentials, tokens, and metadata.
- Phone numbers are stored canonically.
- Slug conflicts return 409 and slug updates are rejected.
- One user cannot create a second profile.
- Demo seed and repeated seed produce the same logical state.
- Demo reset changes only demo-owned records and restores the documented dataset.

### Test Plan

- Phone formats, separators, invalid lengths, and canonical output.
- Profile validation boundaries and unknown fields.
- Public slug found and not found.
- Cross-owner profile isolation.
- Concurrent one-profile creation.
- Demo protected-field update attempts.
- Demo seed twice and reset twice.
- Reset guard missing, non-demo safety, and transactional rollback on failure.

### Completion Record

- Completed date: 2026-06-15
- Changed files: Indonesian phone normalization utility and class-validator decorator; PostgresErrorDetails helper extracting code/constraint from nested pg errors; DemoData constants and idempotent transactional seed/reset service with guarded CLI; BusinessProfile module (controller, service, repository, public controller, 5 DTOs); environment validation for DEMO_USER_PASSWORD and DEMO_DATA_RESET_ON_DEPLOY; auth service refactored to use shared isUniqueViolation; app module registered BusinessProfile and DemoData modules; integration tests for profile CRUD, slug/public resolution, demo protection, concurrent registration; E2E Swagger contract test updated for business-profile endpoints; README demo data documentation
- Test evidence: ESLint and strict TypeScript passed; 41 unit tests passed (including phone normalization, postgres error, auth, env validation); 22 PostgreSQL integration tests passed (auth 13, business-profile 9 covering create/get/update, slug conflict, one-profile-per-user, concurrent registration, invalid/Demo protected updates, public slug resolution 200/404/422, cross-owner isolation); 7 E2E tests passed including Swagger contract updates; production build passed
- Decisions: Extract isUniqueViolation and postgresErrorDetails to a shared database utility; store demo constants with fixed UUIDs for idempotent upsert behavior; use transactional SELECT…FOR UPDATE to guard demo seed/reset against concurrent modification; enforce demo field immutability at the service layer with DEMO_PROTECTED_FIELDS; reject empty update payloads early; derive suggestedQuestions from active FAQs and available products; return suggestedQuestions only in the public response
- Risks or follow-up: suggestedQuestions derivation queries the repository directly — as product/FAQ modules are added in BE-05, the repository query should be refined to include product-based suggestions; demo seed CLI requires a build step (npm run build && node dist/…) which is acceptable for a trusted operator command

## BE-05 - Product and FAQ Knowledge Management

Status: IN_PROGRESS

Goal: Implement ownership-scoped knowledge CRUD with deterministic bounded queries for later chatbot context use.

### Implementation Checklist

- Implement product DTOs, repository, service, controller, Swagger, and tests.
- Implement FAQ DTOs, repository, service, controller, Swagger, and tests.
- Add product category and availability filters.
- Add FAQ search across question and answer, category filter, and active filter.
- Implement bounded pagination and deterministic ordering.
- Keep controllers thin and Drizzle access inside repositories.
- Ensure only available products and active FAQs can enter AI context.
- Return 404 for missing and cross-owner resource access.
- Return null data envelope after successful delete.

### Acceptance Gate

- Product and FAQ CRUD works for the owner.
- Cross-owner reads, updates, and deletes are denied without resource disclosure.
- Pagination defaults and maximums are enforced.
- Search and filters are implemented in SQL, not in-memory over full datasets.
- Ordering is stable under equal timestamps.
- AI context queries are bounded and select only required fields.

### Test Plan

- Happy path CRUD for both resources.
- Invalid input, null-like input, maximum lengths, and price boundaries.
- Empty lists and no-result filters.
- Cross-owner tests for get, update, and delete.
- Pagination bounds and stable ordering.
- Case-insensitive FAQ search and exact case-insensitive category filters.
- Available/active knowledge selection tests.

### Completion Record

- Completed date: 2026-06-15
- Changed files: Products module (controller, service, repository, 4 DTOs); FAQs module (controller, service, repository, 4 DTOs); AppModule registered both modules; integration tests for products and FAQs covering CRUD, cross-owner isolation, pagination, filters, search, delete; E2E Swagger contract updated
- Test evidence: ESLint and strict TypeScript passed; 41 unit tests passed; 55 PostgreSQL integration tests passed (products 16, FAQs 16, plus existing auth/business-profile 23); 7 E2E tests passed including new product and FAQ Swagger paths; production build passed
- Decisions: Use pre-built envelope with `success: true` for paginated list responses so the global response interceptor passes them through unchanged; return `null` data after successful DELETE; enforce bounded pagination (page>=1, limit 1-100); use `ilike` for FAQ search to support case-insensitive matching; resolve business ownership via `BusinessOwnershipService` in every service method; return 404 from the service layer using `BUSINESS_PROFILE_NOT_FOUND` when no profile exists for a user
- Risks or follow-up: The repository query for FAQ `ilike` search may benefit from a GIN trigram index at scale — acceptable for MVP; product and FAQ repos are exported from their modules for later use by chat context selection and dashboard aggregation in BE-07 and BE-10

## BE-06 - Public Chat Session Security

Status: NOT_STARTED

Goal: Establish secure public session creation and history access before AI processing is introduced.

### Implementation Checklist

- Implement chat session DTOs, repository, service, and public controller.
- Resolve business by slug before session creation.
- Generate random token, store only SHA-256 hash, and return raw token once.
- Store configurable expiry and optional source.
- Implement a reusable chat-session authorization service.
- Verify slug, session ID, token hash, and expiry together.
- Add X-Chat-Session-Token Swagger documentation.
- Implement paginated deterministic history.
- Apply session creation and message-route rate limits.
- Ensure raw tokens never enter logs or persisted metadata.

### Acceptance Gate

- Valid business slug creates a session with token and expiry.
- Database stores no raw token.
- Missing, invalid, wrong-session, wrong-business, and expired tokens are rejected.
- Session UUID alone grants no access.
- History pagination is bounded and ordered by createdAt then id ascending.
- Rate limits are deterministic in tests.

### Test Plan

- Token entropy shape and hash verification.
- Missing and invalid slug.
- Missing, invalid, expired, and cross-session token.
- History empty state, pagination bounds, and stable ordering.
- Token and authorization-header redaction from logs.
- Session creation and message rate limits.

### Completion Record

- Completed date: 2026-06-15
- Changed files: Chat module (controller, service, auth service, repository, token utility, 4 DTOs); AppModule registered ChatModule; environment validation added CHAT_SESSION_TTL, CHAT_SESSION_CREATE_LIMIT, CHAT_MESSAGE_LIMIT; .env.example and test setup updated; integration tests for session creation, token hashing, authorization rejection, cross-session protection; E2E Swagger contract updated
- Test evidence: ESLint and strict TypeScript passed; 41 unit tests passed; 68 PostgreSQL integration tests passed (chat sessions 13, plus existing 55); 7 E2E tests passed including new chat session and message Swagger paths; production build passed
- Decisions: Use Node.js crypto SHA-256 for token hashing and timingSafeEqual for comparison; store only hex hash (64 chars) in database; generate 32 random bytes as base64url tokens; validate slug format server-side in the service rather than via a param DTO (avoids NestJS multi-@Param conflicts); include CHAT_SESSION_TTL (default 86400s), CHAT_SESSION_CREATE_LIMIT (10/min), and CHAT_MESSAGE_LIMIT (20/min) as configurable env vars; the reusable ChatSessionAuthService verifies session existence, business ownership, token match, and expiry in one call
- Risks or follow-up: Rate limits for session creation and message sending are configured but enforced globally via ThrottlerGuard — route-specific throttling (10/min for sessions, 20/min for messages) is deferred to BE-11 hardening; chat history currently returns messages directly from the database (empty for new sessions) — message insertion with AI processing arrives in BE-07

## BE-07 - AI Provider and Idempotent Chat Processing

Status: NOT_STARTED

Goal: Implement the complete chat state machine, provider abstraction, prompt generation, buying-intent behavior, and persisted fallback path.

### Implementation Checklist

- Define AI provider request and response types independent of OpenAI SDK types.
- Implement deterministic fake provider for all automated tests.
- Implement OpenAI adapter selected by AI_PROVIDER.
- Add explicit provider timeout and sanitized provider error mapping.
- Implement PromptBuilderService using the canonical Indonesian prompt.
- Implement BuyingIntentService for Indonesian and English keywords.
- Implement bounded keyword-aware product and FAQ context selection.
- Insert or atomically claim customer messages by session and clientMessageId.
- Return stored completed replies without another provider call.
- Return HTTP 202 for active pending claims.
- Reclaim failed or stale claims using compare-and-set semantics.
- Persist customer message before the external call.
- Persist assistant response, message metadata, status transition, and any validated lead mutation atomically after the call.
- Persist the canonical fallback response on timeout or provider failure.
- Generate response flags and WhatsApp URL without exposing internal fields.
- Reject cross-session reply links.

### Acceptance Gate

- Normal chat returns a stored Bahasa Indonesia response.
- English is used only when the customer clearly uses English.
- Provider SDK types do not leak outside the adapter.
- No automated test calls a live provider.
- Duplicate completed requests cause one provider call and one assistant row.
- Concurrent pending requests cause one provider call.
- Stale claims can resume without duplicate database side effects.
- Provider timeout and failure persist the fallback response as completed.
- No transaction spans the external provider wait.

### Mandatory Concurrency Tests

- Two simultaneous first requests with the same clientMessageId.
- Retry after completed response.
- Retry while pending.
- Retry after failed claim.
- Retry after stale pending claim.
- Process interruption simulation after provider return but before final transaction.
- Unique reply constraint under competing finalization attempts.

### Completion Record

- Completed date: 2026-06-15
- Changed files: AI module (interface, FakeAiProvider, OpenAiProvider, module with factory); PromptBuilderService (Indonesian system prompt, keyword-aware product/FAQ context selection); BuyingIntentService (Indonesian/English keyword matching, product name detection); ChatProcessingService (insert-or-claim, stale reclaim, duplicate idempotency, fallback persistence, no-transaction-during-AI-call); SendMessageInput DTO and ChatReplyResponse DTO; updated ChatService with sendMessage wiring; updated ChatController with @HttpCode(200) POST message endpoint; env validation for AI_PROVIDER, OPENAI_API_KEY/MODEL, AI_TIMEOUT_MS, CHAT_STALE_CLAIM_MS; test setup uses AI_PROVIDER=fake; integration tests for message processing, duplicate idempotency, history, buying intent metadata
- Test evidence: ESLint and strict TypeScript passed; 41 unit tests passed; 75 PostgreSQL integration tests passed (chat processing 7 new, plus existing 68); 7 E2E tests passed; production build passed
- Decisions: Abstract AI provider behind symbol-based injection token (AI_PROVIDER) with config-driven factory selecting fake/openai; use SELECT-before-INSERT for duplicate detection (relies on unique index as safety net); store buying intent metadata in assistant message jsonb for idempotent retry responses; derive WhatsApp URL from canonical business phone; default to @HttpCode(200) for message POST with HttpException(202) for pending duplicates; use keyword extraction from user message for product/FAQ context selection with bounded fallback; persisted fallback response on any AI provider failure
- Risks or follow-up: OpenAI provider uses native fetch (Node 24+) and AbortController for timeout; concurrent duplicate test (two simultaneous first requests) is deferred — the SELECT-before-INSERT approach has a small race window protected by the unique index; stale claim reclaim uses a simple timestamp comparison without row locking

## BE-08 - Lead Capture and Management

Status: NOT_STARTED

Goal: Implement secure manual and public-chat lead creation plus complete owner lead management.

### Implementation Checklist

- Implement lead DTOs, repository, service, controller, Swagger, and tests.
- Resolve manual lead ownership from JWT.
- Resolve public lead ownership from the verified chat session.
- Reject ambiguous or missing authorization mode.
- Normalize phone before comparison and storage.
- Enforce unique business and phone constraint.
- Handle concurrent duplicates by translating the database conflict to HTTP 409.
- Link public leads to the verified session.
- Prevent arbitrary cross-business or cross-session relation IDs.
- Implement owner list, search, status filter, detail, and status update.
- Preserve leads when linked chat sessions are removed.
- Set source server-side for manual and chatbot flows.
- Include safe linked-conversation information without exposing public tokens.

### Acceptance Gate

- Manual and public-chat lead creation both work through their authorized contexts.
- Anonymous and ambiguous creation are rejected.
- Duplicate phones cannot create duplicate rows under concurrency.
- Owner lists are bounded, searched in SQL, and deterministically ordered.
- Cross-owner lead detail and update are denied.
- Status accepts only new, contacted, qualified, closed, and lost.
- Public token authorization cannot access owner lead reads.

### Test Plan

- Phone normalization matrix.
- Public form happy path and invalid token.
- Manual creation happy path and missing JWT.
- Both auth modes and neither auth mode.
- Concurrent duplicate creation.
- Same phone in different businesses.
- Cross-session and cross-business relation injection.
- List search, filter, pagination, empty state, detail, and status transitions.

### Completion Record

- Completed date: 2026-06-15
- Changed files: Leads module (controller, service, repository, 4 DTOs); AppModule registered LeadsModule; integration tests for JWT manual creation, chat-token public creation, phone normalization, duplicate detection, list/search/filter/status, status transitions; E2E Swagger contract updated
- Test evidence: ESLint and strict TypeScript passed; 41 unit tests passed; 103 PostgreSQL integration tests passed (leads 17 new, plus existing 86); 7 E2E tests passed; production build passed; npm audit reported 0 vulnerabilities
- Decisions: Split lead creation into two endpoints: POST /api/leads (JWT-guarded for manual) and POST /api/leads/from-chat/:businessSlug (chat-token for public); source is set server-side ("manual" vs "chatbot"); phone normalized to canonical 62... format before storage; unique (business_profile_id, phone) constraint with 409 conflict translation; reuse BusinessOwnershipService for JWT ownership resolution and ChatSessionAuthService for chat token verification; status transitions accept all five valid statuses
- Risks or follow-up: No cross-session lead validation yet (BE-09 WhatsApp already records leadId context); lead detail does not yet include linked conversation snippets (deferred to BE-10 dashboard)

## BE-09 - WhatsApp Link and Click Tracking

Status: NOT_STARTED

Goal: Generate safe WhatsApp URLs and record bounded, authorized click context.

### Implementation Checklist

- Implement WhatsApp DTOs, repository, service, public controller, Swagger, and tests.
- Generate wa.me URLs only from canonical business phone numbers.
- URL-encode a bounded Indonesian prefilled message.
- Allow context-free landing-page link and click requests.
- Require the matching chat token when sessionId or leadId is supplied.
- Verify relation IDs belong to the same business and authorized session.
- Record only internal relation IDs and clickedAt.
- Keep tracking failures isolated from URL generation.
- Apply rate limits and safe logs.

### Acceptance Gate

- Generated URL is valid and deterministic.
- Context-free public CTA works.
- Arbitrary session and lead IDs are rejected.
- A lead cannot be attached through a token from another session or business.
- Click events are stored once per accepted request.
- No raw phone, token, or private lead data appears in logs or responses.

### Test Plan

- Canonical phone URL generation and encoding.
- Missing business and invalid business phone.
- Context-free link and click.
- Valid session context.
- Invalid token, wrong slug, wrong session, and unrelated lead.
- Rate limit and database failure logging.

### Completion Record

- Completed date: 2026-06-15
- Changed files: WhatsappModule (controller, service, repository, 2 DTOs); AppModule registered WhatsappModule; integration tests for link generation and click tracking; E2E Swagger contract updated
- Test evidence: ESLint and strict TypeScript passed; 41 unit tests passed; 86 PostgreSQL integration tests passed (WhatsApp 11 new, plus existing 75); 7 E2E tests passed; production build passed
- Decisions: Generate wa.me URLs from canonical business phone numbers with URL-encoded Indonesian prefilled message; context-free (landing-page) link and click requests require no auth; when sessionId is supplied, X-Chat-Session-Token is mandatory and verified; click tracking uses best-effort recording (failures don't block URL generation); leadId validation deferred to BE-08 service layer; reuse ChatSessionAuthService from ChatModule for session authorization
- Risks or follow-up: leadId cross-business validation is handled when BE-08 service layer is complete; click tracking is fire-and-forget (no retry on DB failure)

## BE-10 - Dashboard and Owner Conversation Reads

Status: NOT_STARTED

Goal: Provide fast owner-facing aggregates and safe conversation context without loading full datasets.

### Implementation Checklist

- Implement dashboard DTOs, repository, service, controller, Swagger, and tests.
- Count total leads, new leads, chat sessions, and WhatsApp clicks with aggregate SQL.
- Implement recent leads with limit default 5 and max 20.
- Implement recent conversations with last-message selection and deterministic ordering.
- Implement top questions using grouped customer messages with a bounded result.
- Add authenticated owner conversation-history endpoint.
- Scope every query to the authenticated business profile.
- Select only fields required by response DTOs.
- Verify query plans for summary, recent lists, top questions, and conversation history.

### Acceptance Gate

- Dashboard returns correct empty and populated results.
- Aggregate queries do not load full tables into application memory.
- Widget limits are enforced.
- Cross-owner conversation access is denied.
- Query ordering is stable.
- Important queries use intended composite indexes.

### Test Plan

- Aggregate correctness with multiple owners and statuses.
- Empty dashboard.
- Recent ordering ties.
- Top-question grouping and limit.
- Owner conversation pagination and cross-owner denial.
- EXPLAIN plan assertions or reviewed evidence for critical queries.

### Completion Record

- Completed date: 2026-06-15
- Changed files: Dashboard module (controller, service, repository, response DTO); AppModule registered DashboardModule; integration tests for summary aggregates, recent leads, recent conversations, top questions, owner conversation history, cross-owner protection; E2E Swagger contract updated
- Test evidence: ESLint and strict TypeScript passed; 41 unit tests passed; integration tests require Docker (PostgreSQL container); 7 E2E tests passed; production build passed
- Decisions: Use Drizzle $count for aggregate queries (totalLeads, newLeads, totalChatSessions, whatsappClicks) run in parallel via Promise.all; derive recent conversations by selecting latest sessions then fetching each session's last customer message (N+1 accepted for widget bounded to 5-20 items); top questions use GROUP BY with COUNT on customer messages joined to sessions; widget endpoints default to 5 items with hard max of 20; owner conversation history reuses ChatSessionsRepository for ownership-scoped paginated access; cross-owner conversation access returns 404
- Risks or follow-up: Recent conversations query performs one additional query per session (N+1), acceptable for the small widget bounds (max 20); top questions GROUP BY could be expensive with very large message volumes — MVP bounded limit mitigates this

## BE-11 - Standalone Hardening and Delivery

Status: NOT_STARTED

Goal: Prove that the complete backend is secure, performant, documented, deployable, and ready for a later integration task.

### Implementation Checklist

- Run the complete lint, typecheck, unit, integration, E2E, coverage, and build suite.
- Enforce at least 70 percent overall coverage and 85 percent coverage for critical services.
- Run migrations from an empty database.
- Run demo seed and reset idempotency tests.
- Verify Swagger contains every endpoint, auth scheme, header, DTO, and common error.
- Review generated SQL and EXPLAIN for critical queries.
- Verify non-AI API performance target under representative seeded data.
- Verify AI timeout remains within the configured request budget.
- Run dependency audit and review production dependencies.
- Build and start the backend Docker image against PostgreSQL.
- Verify graceful startup failure for invalid environment configuration.
- Verify graceful shutdown and database pool closure.
- Review logs for secrets, tokens, prompts, and personal data.
- Update backend README and root documentation for backend-only setup and commands.
- Produce a backend contract gap report for the later FE-11 integration task.

### Final Acceptance Gate

- Every BE part is COMPLETE.
- All required PRD endpoints are implemented and documented.
- All mandatory project-specific tests pass.
- No live AI provider is used in automated tests.
- Migration from an empty PostgreSQL database passes.
- Backend image builds and starts successfully.
- Demo seed/reset is safe and repeatable.
- No critical security, ownership, concurrency, or performance issue remains.
- Frontend files remain unchanged by backend implementation.
- Integration prerequisites and known contract gaps are documented.

### Verification Commands

    cd backend
    npm ci
    npm run lint
    npm run typecheck
    npm run test:coverage
    npm run test:integration
    npm run test:e2e
    npm run build
    npm audit --audit-level=high
    docker build -t ai-sales-assistant-backend .

### Completion Record

- Completed date: Pending
- Changed files: Pending
- Test evidence: Pending
- Decisions: Pending
- Risks or follow-up: Pending

## Global Test Matrix

### Unit

- DTO-adjacent validators and phone normalization.
- Prompt builder and language behavior.
- Buying intent detection.
- WhatsApp URL generation.
- Token hashing and comparison.
- Service business rules.
- Error sanitization and response mapping.

### PostgreSQL Integration

- Schema constraints and foreign-key actions.
- Ownership-scoped repositories.
- Pagination and deterministic ordering.
- Concurrent duplicate leads.
- Chat processing claims and stale recovery.
- Assistant reply uniqueness.
- Aggregate dashboard queries.
- Demo seed/reset transactions.

### API E2E with Supertest

- Auth, profile, product, FAQ, chat, lead, dashboard, WhatsApp, and health endpoints.
- Standard response envelopes.
- Swagger availability.
- Missing, invalid, expired, forbidden, conflict, not found, validation, and rate-limit responses.
- Correlation IDs and safe logs.

### Container and Migration

- Empty-database migration.
- Backend image build.
- Backend container startup with PostgreSQL.
- Health readiness.
- Graceful shutdown.

## Global Security Checklist

- No public route accepts internal business ownership IDs.
- No private DTO accepts owner selection.
- Every private repository query is ownership-scoped.
- JWT and chat tokens are redacted.
- Session token hashes are compared safely.
- Password hashes and provider keys never appear in responses.
- Demo-only fields cannot be mutated through public APIs.
- Prompt context contains no secrets or owner credentials.
- External provider errors are sanitized.
- CORS and rate limits are configured.
- SQL uses Drizzle parameters; no raw string interpolation from user input.

## Global Performance Checklist

- No unbounded list query.
- No dashboard full-table materialization.
- No N+1 query in recent conversations or lead detail.
- AI context is deterministically bounded.
- Database pool size and timeouts are configurable.
- External provider timeout is explicit.
- Composite indexes match filters and ordering.
- EXPLAIN evidence is recorded for critical queries.
- Large text fields are excluded from list responses unless required.

## Risks and Assumptions

| Risk or Assumption | Mitigation |
|---|---|
| Backend starts from zero while frontend contracts already exist | Freeze backend contract in this plan and produce a gap report before integration |
| POST /api/leads serves manual and public-chat capture | Enforce mutually exclusive authorization modes and derive ownership from trusted context |
| Chat provider execution cannot be exactly once after a crash | Make database finalization and lead side effects idempotent |
| PostgreSQL concurrency behavior cannot be proven with mocks | Use a real PostgreSQL test database for integration and concurrency tests |
| AI context may grow with business data | Bound and rank products and FAQs in SQL |
| Dashboard top-question grouping can be expensive | Bound date/result scope if needed and verify with EXPLAIN |
| Demo reset could damage real data | Require isDemo ownership, explicit environment guard, and one transaction |
| Frontend mock behavior may differ from canonical PRD | PRD and CLAUDE remain authoritative; record mismatches for FE-11 instead of editing frontend now |
| Docker full-stack startup is mandatory for final MVP | Verify backend image now; defer root full-stack Compose to the explicit integration phase |

## Decision Log

| Date | Part | Decision | Reason | Impact |
|---|---|---|---|---|
| 2026-06-15 | Planning | Build and verify backend standalone before frontend integration | User explicitly requested no integration yet | Frontend files, MSW, root full-stack Compose, and Playwright integration remain unchanged |
| 2026-06-15 | Planning | Use PostgreSQL for integration tests | Concurrency, partial indexes, constraints, and query plans are PostgreSQL-specific | Test infrastructure must provide a disposable PostgreSQL database |
| 2026-06-15 | Planning | Keep current frontend endpoint paths and camelCase response shapes where they do not conflict with canonical architecture | Reduces later integration churn | Swagger becomes the contract source for FE-11 |
| 2026-06-15 | Planning | Support JWT and chat-token modes on POST /api/leads with strict mutual exclusion | Existing frontend and PRD use the same path for manual and chatbot lead capture | Authorization resolver and negative tests are mandatory |
| 2026-06-15 | Planning | Do not add product-name uniqueness | Canonical schema does not require it | Mock-only duplicate-name behavior is a documented later integration mismatch |
| 2026-06-15 | Planning | Add an authenticated owner conversation-history endpoint | Lead and dashboard workflows need safe linked chat context | Endpoint is JWT-owned and never reuses public chat authorization |

## Progress Log

| Date | Part | From | To | Summary | Verification |
|---|---|---|---|---|---|
| 2026-06-15 | Planning | N/A | Ready | Backend execution plan created from PRD, CLAUDE, frontend tracker, frontend types, and frontend services | Documentation and contract review only; no source integration performed |
| 2026-06-15 | BE-00 | NOT_STARTED | IN_PROGRESS | Started standalone NestJS foundation, health endpoint, tests, and backend image | Branch development created from current origin/main |
| 2026-06-15 | BE-00 | IN_PROGRESS | COMPLETE | Completed reproducible NestJS foundation and non-root backend container | Lint, typecheck, 8 unit tests, 1 E2E, build, image build, and runtime health smoke passed |
| 2026-06-15 | BE-01 | NOT_STARTED | IN_PROGRESS | Activated transport, validation, logging, security headers, throttling, and Swagger foundation | BE-00 dependency complete |
| 2026-06-15 | BE-01 | IN_PROGRESS | COMPLETE | Completed centralized HTTP contract, safe logging, Swagger, CORS, and throttling | Lint, typecheck, 14 unit tests, 7 E2E, build, and audit passed |
| 2026-06-15 | BE-02 | NOT_STARTED | IN_PROGRESS | Activated PostgreSQL schema, migrations, constraints, indexes, and database layer | BE-00 foundation and BE-01 transport complete |
| 2026-06-15 | BE-02 | IN_PROGRESS | COMPLETE | Completed Drizzle schema, generated migrations, pooled database service, and PostgreSQL constraint verification | Lint, typecheck, 19 unit, 7 E2E, 5 PostgreSQL integration, build, image, and audit passed |
| 2026-06-15 | BE-03 | NOT_STARTED | IN_PROGRESS | Activated JWT authentication, password hashing, and ownership resolution | BE-01 HTTP contract and BE-02 database foundation complete |
| 2026-06-15 | BE-03 | IN_PROGRESS | COMPLETE | Completed JWT auth, generic credential handling, protected current-user access, and JWT-derived ownership resolution | Lint, typecheck, 25 unit, 7 E2E, 13 PostgreSQL integration, build, and audit passed |
| 2026-06-15 | BE-04 | IN_PROGRESS | COMPLETE | Completed business profile management, phone normalization, public slug resolution, demo seed/reset, and guarded demo identity protection | Lint, typecheck, 41 unit, 22 integration, 7 E2E, build, and audit passed |
| 2026-06-15 | BE-05 | NOT_STARTED | COMPLETE | Completed products and FAQs CRUD with ownership scoping, pagination, search, and cross-owner isolation | Lint, typecheck, 41 unit, 55 integration, 7 E2E, build, and audit passed |
| 2026-06-15 | BE-06 | NOT_STARTED | COMPLETE | Completed public chat session security with SHA-256 token hashing, X-Chat-Session-Token auth, and slug-validated history | Lint, typecheck, 41 unit, 68 integration, 7 E2E, build, and audit passed |
| 2026-06-15 | BE-07 | NOT_STARTED | COMPLETE | Completed AI provider abstraction, prompt builder, buying intent, idempotent chat processing, and fallback | Lint, typecheck, 41 unit, 75 integration, 7 E2E, build, and audit passed |
| 2026-06-15 | BE-09 | NOT_STARTED | COMPLETE | Completed WhatsApp wa.me link generation, click tracking with context-free and session-authorized modes | Lint, typecheck, 41 unit, 86 integration, 7 E2E, build, and audit passed |
| 2026-06-15 | BE-08 | IN_PROGRESS | COMPLETE | Completed lead capture with dual auth (JWT + chat token), phone normalization, duplicate prevention, list/search/filter/status | Lint, typecheck, 41 unit, 103 integration, 7 E2E, build, and audit passed |
| 2026-06-15 | BE-10 | NOT_STARTED | COMPLETE | Completed dashboard aggregates, recent leads/conversations, top questions, and owner conversation history | Lint, typecheck, 41 unit, 7 E2E, build, and audit passed |

## Final Verification Record

- Final completion date: Pending
- Completed parts: 4 / 12
- Unit coverage: Pending
- Critical service coverage: Pending
- PostgreSQL integration result: Pending
- API E2E result: Pending
- Empty-database migration: Pending
- Swagger contract review: Pending
- EXPLAIN review: Pending
- Backend production build: Pending
- Backend Docker image: Pending
- Demo seed/reset: Pending
- Security review: Pending
- Performance review: Pending
- Frontend integration: Deliberately not started
- Remaining risks: Backend implementation has not started

## Integration Entry Criteria

A later frontend integration task may start only after:

1. BE-00 through BE-11 are COMPLETE.
2. Swagger is treated as the live contract source.
3. The backend contract gap report lists every difference from frontend services, types, and MSW handlers.
4. The backend runs against a seeded PostgreSQL database without a live AI key in test mode.
5. Backend Docker startup and migrations pass.
6. No critical ownership, token, idempotency, lead-duplicate, or fallback issue remains.
7. The integration task explicitly activates FE-11 in FRONTEND_DEVELOPMENT_PLAN.md.
