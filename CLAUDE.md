# CLAUDE.md

## Project: AI Sales Assistant for UMKM

This is a full-stack portfolio project that helps Indonesian small businesses (UMKM) answer customer questions automatically via an AI chatbot, collect leads, and manage product/FAQ data from a dashboard.

The canonical specification is: `PRD_AI_Sales_Assistant_for_UMKM.md`. **Read the relevant PRD section before implementing any module.**

### Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js + TypeScript + Tailwind CSS + Shadcn UI |
| Backend | NestJS + TypeScript |
| Database | PostgreSQL |
| ORM | Drizzle ORM + Drizzle Kit (migrations) |
| Validation | class-validator + class-transformer (DTO-based) |
| API Docs | Swagger / OpenAPI (`@nestjs/swagger`) at `/api/docs` |
| Auth | JWT (bcrypt or Argon2 for password hashing) |
| AI Provider | OpenAI for MVP (abstracted behind a replaceable provider interface) |
| Testing | Jest + Supertest + Playwright |
| Containerization | Docker + Docker Compose |
| Deployment | Railway (backend + frontend + PostgreSQL) via Docker |

### Project Structure

```
ai-sales-assistant/
├── backend/                          # NestJS API server
│   ├── src/
│   │   ├── main.ts
│   │   ├── app.module.ts
│   │   ├── config/                   # Environment-specific config
│   │   ├── common/                   # Shared decorators, filters, guards, interceptors, pipes
│   │   ├── database/
│   │   │   ├── database.module.ts
│   │   │   ├── database.service.ts
│   │   │   ├── schema/               # Drizzle table definitions
│   │   │   ├── migrations/           # Drizzle Kit generated SQL
│   │   │   └── seeds/                # Idempotent demo seed and guarded reset command
│   │   └── modules/
│   │       ├── auth/
│   │       ├── business-profile/
│   │       ├── products/
│   │       ├── faqs/
│   │       ├── chat/                 # Includes prompt-builder.service & buying-intent.service
│   │       ├── leads/
│   │       ├── dashboard/
│   │       ├── ai/                   # AI provider abstraction (interface + providers)
│   │       ├── whatsapp/
│   │       └── error-log/
│   ├── Dockerfile
│   ├── drizzle.config.ts
│   ├── package.json
│   └── .env.example
├── frontend/                         # Next.js app
│   ├── app/
│   │   ├── page.tsx                  # Landing page
│   │   ├── demo-chat/                # Public chatbot demo
│   │   ├── login/
│   │   └── dashboard/                # Protected dashboard (products, faqs, leads, settings)
│   ├── components/
│   ├── lib/
│   ├── services/
│   ├── types/
│   ├── Dockerfile
│   ├── package.json
│   └── .env.example
├── docker-compose.yml                # Local dev: postgres + backend + frontend
├── .env.example                      # Root env template
├── PRD_AI_Sales_Assistant_for_UMKM.md
├── CLAUDE.md
└── README.md
```

---

## Authoritative Architecture Decisions

The following decisions resolve ambiguities in the PRD and are mandatory for implementation. Detailed requirements live in PRD sections 9.2-9.10, 18, 20, and 24.4.

### Public and Private Boundaries

- Public chatbot routes identify a business by unique `businessSlug`, never by internal user or business-profile UUID.
- `business_profiles.slug` is required, unique, URL-safe, and stable for the demo business (`kopi-senja-umkm`).
- Creating a public chat session returns a cryptographically random session token; store only its SHA-256 hash and expiration.
- Public message and history requests require `X-Chat-Session-Token`. A session UUID alone is not authorization.
- Public WhatsApp routes use `businessSlug`; relation IDs require the matching session token when chat or lead context is supplied.
- Private dashboard routes derive ownership from the validated JWT. DTOs must not accept `userId` or `businessProfileId` to choose an owner.
- Every private repository read or write is scoped by both resource ID and the authenticated business profile ID.

### Data Integrity

- The MVP supports one business profile per user; enforce a unique constraint on `business_profiles.user_id`.
- Normalize accepted Indonesian phone formats (`08...`, `628...`, `+628...`) to canonical `62...` before storage or comparison.
- Enforce `unique (business_profile_id, phone)` for leads. The database constraint is the concurrency-safe duplicate guard.
- Every customer chat request includes a UUID `clientMessageId`; enforce `unique (chat_session_id, client_message_id)`.
- Each assistant response references its customer message through a unique `reply_to_message_id`.
- Customer messages use `pending`, `completed`, or `failed` processing status and an atomic processing claim.
- All list and chat-history endpoints use bounded pagination with deterministic ordering.

### External Calls and Transactions

- Persist the customer message before the AI request.
- Never keep a database transaction open while awaiting an external AI provider.
- Persist the assistant response and related lead update atomically after the provider returns.
- A completed retry returns the stored result without another provider call or side effect.
- A concurrent retry while processing is pending must not start a parallel provider call.
- A stale claim may be resumed after a configured timeout. Provider execution cannot be guaranteed exactly once after a process crash, so database responses and lead side effects must remain idempotent.
- AI timeout or provider failure persists the Indonesian fallback response and emits a sanitized structured error log.

### Demo and Operations

- The shared demo email, password, slug, and core business identity cannot be changed through the dashboard.
- Only trusted seed code may set `users.is_demo`; public registration and update DTOs must never expose it.
- Demo seed/reset commands are idempotent, environment-aware, transactional, and never exposed as an unauthenticated HTTP endpoint.
- Structured stdout/stderr logs with correlation IDs are primary. Database `error_logs` writes are optional and best-effort.
- Dockerfiles and root Docker Compose are mandatory MVP deliverables, regardless of older optional wording.

---

## NestJS Conventions

- **File naming**: kebab-case files, e.g. `create-product.dto.ts`, `products.service.ts`
- **Module structure per feature**:
  - `*.controller.ts` — thin, handles HTTP, calls service
  - `*.service.ts` — business logic only, never touches HTTP objects
  - `*.repository.ts` — database access via Drizzle, returns domain objects
  - `dto/` — one file per DTO: `create-*.dto.ts`, `update-*.dto.ts`, `*-response.dto.ts`, `*-query.dto.ts`
- **Global pipes**: `ValidationPipe` must be registered globally
- **Global filters**: `HttpExceptionFilter` for centralized error handling
- **Global interceptors**: `ResponseInterceptor` wraps all responses in the standard envelope
- **Swagger**: Every controller and DTO must have `@nestjs/swagger` decorators explaining the endpoint, request body, and response shape
- **Guards**: `JwtAuthGuard` protects all dashboard routes; authorization still requires ownership-scoped repository queries

## Drizzle ORM Rules

- Schema files live in `backend/src/database/schema/`
- All schemas are exported from `schema/index.ts`
- Never auto-drop tables in migration scripts
- Use Drizzle Kit for all schema changes:
  - `npm run db:generate` — generate migration SQL
  - `npm run db:migrate` — apply migrations
  - `npm run db:push` — push schema directly (dev only)
  - `npm run db:studio` — open Drizzle Studio
- Repository methods return Drizzle-typed results; controllers/services never import Drizzle directly
- Required constraints and composite indexes (defined in PRD section 24.4):
  ```
  unique business_profiles.slug
  unique business_profiles.user_id
  unique leads (business_profile_id, phone)
  unique chat_messages (chat_session_id, client_message_id)
  unique chat_messages (reply_to_message_id) where reply_to_message_id is not null
  leads (business_profile_id, status, created_at desc, id desc)
  leads (business_profile_id, created_at desc, id desc)
  chat_sessions (business_profile_id, created_at desc, id desc)
  chat_messages (chat_session_id, created_at, id)
  products (business_profile_id, is_available, created_at desc, id desc)
  products (business_profile_id, category, created_at desc, id desc)
  faqs (business_profile_id, is_active, created_at desc, id desc)
  whatsapp_click_events (business_profile_id, clicked_at desc, id desc)
  ```

## AI Integration Rules

- **All AI calls go through the backend** — never call AI provider APIs from the frontend
- AI provider MUST be abstracted behind `ai-provider.interface.ts` so it can be swapped
- MVP concrete provider: `openai.provider.ts`, selected with `AI_PROVIDER=openai`
- Gemini and Groq are future adapters and must not be implemented until required
- Tests use a deterministic fake provider and never call a live provider
- `AiService` builds prompt context from business profile + products + FAQs, calls the provider, and returns the response
- `PromptBuilderService` assembles the system prompt + context template (PRD sections 15.1–15.2)
- `BuyingIntentService` detects buying intent via keyword matching (PRD section 15.4)
- **Chatbot language**: Bahasa Indonesia by default; English only if the customer clearly uses English
- **Fallback**: When the AI provider fails, return the Indonesian fallback message (PRD section 15.3) — never expose raw errors to the customer

## Standard API Response Format

All endpoints must return this envelope:

```json
// Success:
{ "success": true, "message": "...", "data": { ... } }

// Paginated:
{ "success": true, "message": "...", "data": [...], "meta": { "page": 1, "limit": 10, "total": 25, "totalPages": 3 } }

// Error:
{ "success": false, "message": "Validation failed", "errors": [{ "field": "price", "message": "..." }] }
```

## Docker & Railway Deployment

- **Local dev**: `docker-compose up` from the root starts PostgreSQL, backend, and frontend
- Each service has its own `Dockerfile`:
  - Backend: multi-stage build, runs `node dist/main.js` (or `npm run start:prod`)
  - Frontend: multi-stage build, standalone Next.js output
- **Railway**: Three services from a single repo:
  - PostgreSQL database (Railway database service)
  - Backend (Railway service from `backend/`, Dockerfile)
  - Frontend (Railway service from `frontend/`, Dockerfile)
- Environment variables are set per-service in Railway, not committed to the repo
- `NODE_ENV=production` on Railway; `NODE_ENV=development` in local Docker Compose

## Database Design

Nine tables (PRD section 18):
`users`, `business_profiles`, `products`, `faqs`, `chat_sessions`, `chat_messages`, `leads`, `whatsapp_click_events`, `error_logs`

Key relationships:
- `business_profiles.user_id` → `users.id`
- `products.business_profile_id` → `business_profiles.id`
- `faqs.business_profile_id` → `business_profiles.id`
- `chat_sessions.business_profile_id` → `business_profiles.id`
- `chat_messages.chat_session_id` → `chat_sessions.id`
- `leads.business_profile_id` → `business_profiles.id`
- `leads.chat_session_id` → `chat_sessions.id`
- `whatsapp_click_events.business_profile_id` → `business_profiles.id`
- `whatsapp_click_events.chat_session_id` → `chat_sessions.id`
- `whatsapp_click_events.lead_id` → `leads.id`

Required identity and integrity fields:
- `users.is_demo` marks the only account eligible for guarded demo reset behavior
- `business_profiles.slug` is unique and public; internal UUIDs remain internal
- `business_profiles.user_id` is unique for the one-business-per-user MVP
- `chat_sessions.access_token_hash` stores the public session credential hash
- `chat_sessions.expires_at` limits public session lifetime
- `chat_messages.client_message_id` provides customer-message idempotency
- `chat_messages.reply_to_message_id` links the stored response used for idempotent retries
- `chat_messages.processing_status` and `processing_started_at` coordinate message processing claims
- Lead and customer phone values are canonicalized to `62...`
- Foreign-key nullability and delete behavior must be explicit in migrations

## Portfolio-Specific Constraints

- **Demo mode is mandatory**: Seeded demo business ("Kopi Senja UMKM") with products, FAQs, and credentials documented in README
- **Demo recovery is mandatory**: Provide an idempotent reset command while preventing dashboard changes to demo credentials, slug, and core identity
- **Recruiter experience**: Landing page is public, chatbot demo works without login, dashboard accessible with demo credentials
- **Swagger must be live** at `/api/docs` on the deployed backend
- **Chatbot default language**: Bahasa Indonesia (see PRD sections 15–16 for exact prompts)
- **PRD is the source of truth**: For requirements, validation rules, DTO lists, API endpoints, landing page content, and prompt templates — check the PRD first
- **README must include**: Demo URL, demo credentials, architecture diagram, tech stack, how to run locally, testing commands, API docs link, screenshots (see PRD section 32)
- **Docker is mandatory**: Both service images and root Docker Compose must build and start successfully

---

## Core Working Rules

Claude must follow these rules:

1. Do not modify files before explaining the plan.
2. Always inspect existing project patterns before implementing.
3. Follow the existing folder structure.
4. Follow existing naming conventions.
5. Follow existing coding style.
6. Keep changes focused and minimal.
7. Avoid overengineering.
8. Prefer readable code over clever code.
9. Do not introduce new dependencies unless clearly justified.
10. Do not rewrite large parts of the codebase unless explicitly requested.
11. If assumptions are required, state them clearly.
12. If a requirement is unclear, continue with the safest reasonable assumption and mention it.
13. If the task is risky, explain the risk before making changes.
14. Always consider edge cases.
15. Always consider test coverage.

---

## Exploration Rule

Before implementation, Claude should inspect the codebase and return:

1. Understanding of the task
2. Related files
3. Existing patterns
4. Recommended implementation location
5. Implementation plan
6. Test plan
7. Risks and assumptions

Claude should not change files during the exploration phase.

---

## Architecture Rules

Claude must follow the existing architecture of the project.

General rules:

1. Keep responsibilities separated.
2. Avoid mixing business logic with UI or transport layer.
3. Avoid duplicating logic.
4. Prefer reusable functions for shared behavior.
5. Prefer small functions with clear responsibility.
6. Keep side effects explicit.
7. Avoid global state unless already used by the project.
8. Avoid hidden coupling between modules.
9. Preserve backward compatibility unless explicitly instructed.
10. Do not remove existing behavior without explaining the impact.

For backend projects:

1. Keep controllers/resolvers/routes thin.
2. Put business logic in service/use-case/domain layer when available.
3. Keep database access separated when the project has repository/model patterns.
4. Validate input before processing.
5. Handle null and undefined values safely.
6. Avoid loading large datasets into memory.
7. Use pagination for list endpoints.
8. Use transactions when data consistency requires it.
9. Consider idempotency for retryable operations.
10. Consider race conditions for concurrent operations.

For frontend projects:

1. Keep components focused and readable.
2. Avoid putting complex business logic directly inside UI components.
3. Extract reusable logic into hooks, composables, utilities, or services when appropriate.
4. Follow existing state management patterns.
5. Keep UI state and server state clearly separated when possible.
6. Handle loading, empty, error, and success states.
7. Preserve accessibility.
8. Avoid unnecessary re-renders.
9. Avoid deeply nested component logic.
10. Keep forms validated and user-friendly.

---

## Backend Rules

When working on backend code, Claude should check:

1. Input validation
2. Error handling
3. Authentication
4. Authorization
5. Data consistency
6. Database performance
7. Pagination
8. Logging
9. Idempotency
10. Race conditions
11. External API failure
12. Retry behavior
13. Timeout behavior
14. Security risks
15. Test coverage

Claude should avoid:

1. Fat controllers
2. Fat resolvers
3. Repeated database queries
4. N+1 query patterns
5. Unbounded queries
6. Silent failures
7. Unsafe logs
8. Hardcoded secrets
9. Breaking API contracts
10. Large refactors without need

---

## Frontend Rules

When working on frontend code, Claude should check:

1. Component responsibility
2. State management
3. Loading state
4. Empty state
5. Error state
6. Form validation
7. Accessibility
8. Responsive behavior
9. Performance
10. Re-render risk
11. API integration
12. Type safety
13. User experience
14. Test coverage
15. Visual consistency

Claude should avoid:

1. Large components with mixed responsibilities
2. Duplicated UI logic
3. Unclear state flow
4. Hardcoded UI text if the project uses i18n
5. Inline complex logic inside JSX/templates
6. Ignoring error states
7. Ignoring accessibility
8. Unnecessary dependencies
9. Breaking existing design patterns
10. Changing visual behavior without explaining it

---

## API Rules

When working with APIs, Claude should check:

1. Request validation
2. Response shape consistency
3. Error response consistency
4. Authentication and authorization
5. Backward compatibility
6. Pagination
7. Filtering and sorting behavior
8. Rate limit impact when relevant
9. Timeout behavior
10. External dependency failure

Project-specific API checks:

1. Public routes use `businessSlug`, never internal ownership IDs.
2. Public chat routes verify `X-Chat-Session-Token`.
3. Private routes derive ownership from JWT and scope repository queries.
4. Chat writes enforce `clientMessageId` idempotency.
5. List and history responses enforce maximum page size and deterministic ordering.

Claude should not change existing API contracts unless explicitly requested.

If an API contract must change, Claude should explain:

1. What changes
2. Why it changes
3. What can break
4. Migration plan
5. Test plan

---

## Database Rules

When working with database logic, Claude should check:

1. Query correctness
2. Index usage
3. Query performance
4. Data consistency
5. Migration impact
6. Null or missing relation handling
7. Large dataset behavior
8. Transaction requirements
9. Duplicate data risk
10. Backward compatibility

Claude should avoid:

1. Unbounded queries
2. Loading unnecessary fields
3. N+1 query patterns
4. Schema changes without explanation
5. Data migrations without rollback plan
6. Unsafe destructive operations

If modifying database schema, Claude should explain:

1. Schema change
2. Reason
3. Backward compatibility
4. Migration plan
5. Rollback plan
6. Test plan

---

## Worker / Background Job Rules

When working with workers, queues, cron jobs, or background processing, Claude should check:

1. Idempotency
2. Retry behavior
3. Duplicate processing risk
4. Race condition risk
5. Batch size
6. Memory usage
7. Timeout behavior
8. Partial failure handling
9. Logging
10. Monitoring
11. Recovery behavior
12. Error reporting

Claude should avoid:

1. Letting one failed item stop the entire batch unless required
2. Infinite retries without control
3. Large synchronous loops for huge data
4. Missing logs for failed jobs
5. Duplicate side effects
6. Hidden failures

---

## Testing Rules

For every new feature or bug fix, Claude should add or suggest tests.

Required test coverage:

1. Happy path
2. Invalid input
3. Null or undefined input
4. Empty result
5. Error handling
6. Permission or authorization case when relevant
7. Duplicate prevention when relevant
8. Edge cases
9. Regression test for bug fixes

Testing principles:

1. Follow existing test structure.
2. Follow existing test naming style.
3. Mock external services.
4. Avoid testing implementation details.
5. Test behavior and expected output.
6. Keep tests readable.
7. Prefer deterministic tests.
8. Avoid flaky tests.
9. If code is hard to test, suggest a small refactor.

Claude should identify missing tests before finalizing implementation.

For this project, tests must also cover cross-owner access, public slug resolution, invalid session tokens, duplicate message retries, concurrent duplicate leads, phone normalization, AI timeout fallback persistence, pagination bounds, demo reset idempotency, and Docker image startup.

---

## Security Rules

Claude must check security risks when touching:

1. Authentication
2. Authorization
3. User input
4. File upload
5. Payment
6. Webhook
7. External API
8. Admin features
9. Personal data
10. Tokens or secrets
11. Logging
12. Database queries

Claude should check for:

1. Missing validation
2. Permission bypass
3. Data exposure
4. Injection risk
5. Unsafe file handling
6. Unsafe redirects
7. Secret leakage
8. Sensitive data in logs
9. Insecure defaults
10. Broken access control

Claude must not hardcode secrets, API keys, passwords, or tokens.

---

## Performance Rules

Claude must consider performance when touching:

1. Database queries
2. API endpoints
3. Frontend rendering
4. Large lists
5. Background jobs
6. File processing
7. External API calls
8. Caching logic
9. Search/filter/sort features
10. Data exports

Claude should check:

1. Time complexity
2. Memory usage
3. Query count
4. N+1 query risk
5. Pagination
6. Batch size
7. Caching opportunities
8. Re-render risk
9. Bundle size impact
10. Timeout risk

Claude should explain performance risks and propose safer alternatives.

---

## Error Handling Rules

Claude should ensure errors are handled clearly.

Backend error handling should include:

1. Validation errors
2. Not found errors
3. Permission errors
4. External service errors
5. Database errors
6. Timeout errors
7. Unexpected errors

Frontend error handling should include:

1. API failure state
2. Form validation message
3. Empty state
4. Loading state
5. Retry option when appropriate
6. User-friendly error message

Claude should avoid silent failures.

---

## Logging and Monitoring Rules

When adding or changing important flows, Claude should consider logging.

Logs should help answer:

1. What happened?
2. Which operation failed?
3. Which entity was affected?
4. Why did it fail?
5. Is it retryable?
6. What should be checked next?

Application logs must be structured stdout/stderr logs with a correlation ID. Database error logging is supplemental and must never be required to complete error handling.

Claude should avoid logging:

1. Passwords
2. Tokens
3. API keys
4. Payment secrets
5. Sensitive personal data
6. Full request body when it may contain private data

---

## Dependency Rules

Claude should not add dependencies unless necessary.

Before adding a dependency, Claude must explain:

1. Why it is needed
2. What problem it solves
3. Why existing code cannot solve it
4. Bundle size or runtime impact
5. Security and maintenance risk
6. Alternative options

Prefer native or existing project utilities when reasonable.

---

## Refactoring Rules

Claude may suggest refactoring when it improves:

1. Readability
2. Testability
3. Maintainability
4. Performance
5. Security
6. Duplication reduction

Claude should avoid unrelated refactors during feature work.

For refactoring, Claude should explain:

1. Current problem
2. Proposed refactor
3. Behavior that must remain unchanged
4. Test coverage
5. Risk

---

## Git Rules

Before implementation:

1. Check current git status when appropriate.
2. Explain the implementation plan.
3. Mention files likely to change.

After implementation:

1. Summarize changed files.
2. Explain why each file changed.
3. Provide test commands.
4. Provide risk notes.
5. Suggest commit message.
6. Suggest PR title.
7. Suggest PR description.

Claude should not run destructive git commands unless explicitly requested.

Avoid:

```bash
git reset --hard
git clean -fd
git push --force
```

---

## Command Rules

Claude may suggest or run safe commands that are already part of the project workflow.

Common safe commands:

```bash
npm test
npm run test
npm run test:unit
npm run test:integration
npm run lint
npm run build
npm run typecheck
pnpm test
pnpm lint
pnpm build
yarn test
yarn lint
yarn build
git status
git diff
```

Claude should inspect `package.json`, project config, or documentation before assuming commands.

Claude should not run destructive commands unless explicitly requested.

Avoid:

```bash
rm -rf
git reset --hard
git clean -fd
npm audit fix --force
pnpm update --latest
yarn upgrade --latest
```

---

## Documentation Rules

Claude should update documentation when changes affect:

1. Setup steps
2. Environment variables
3. API contract
4. User flow
5. Architecture
6. Background jobs
7. Deployment steps
8. Testing steps
9. Operational behavior

Documentation should be concise, accurate, and easy to follow.

---

## Pull Request Output Format

When asked to create a PR description, Claude should use this format:

```md
## Summary

Explain what changed in simple terms.

## Business Context

Explain why this change is needed.

## Technical Changes

- Change 1
- Change 2
- Change 3

## Test Coverage

- Test 1
- Test 2
- Test 3

## Edge Cases Covered

- Edge case 1
- Edge case 2
- Edge case 3

## Risks

- Risk 1
- Risk 2

## Rollback Plan

Explain how to safely revert this change.
```

---

## Default Task Output Format

For every engineering task, Claude should respond with:

1. Understanding
2. Related files
3. Existing patterns
4. Implementation plan
5. Risks and assumptions
6. Test plan
7. Suggested next step

After making code changes, Claude should respond with:

1. Changed files
2. Summary of changes
3. Important implementation notes
4. Test coverage
5. Test command
6. Remaining risks
7. Suggested commit message
8. PR description draft

---

## Final Verification Checklist

Before considering a task complete, Claude should verify:

1. Requirement is satisfied
2. Existing behavior is preserved
3. Edge cases are handled
4. Tests are added or updated
5. Tests pass or failing tests are explained
6. Lint/typecheck/build passes or issues are explained
7. Performance risks are considered
8. Security risks are considered
9. Documentation is updated when needed
10. Git diff is reviewed
11. PR description is ready
