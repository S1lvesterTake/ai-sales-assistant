# AGENTS.md

## Project Context

This is a full-stack portfolio product for Indonesian UMKM. It provides a public AI sales chatbot, lead capture, WhatsApp handoff, and an authenticated owner dashboard.

Required stack:

- Frontend: Next.js, TypeScript, Tailwind CSS, Shadcn UI
- Backend: NestJS and TypeScript
- Database: PostgreSQL with Drizzle ORM and Drizzle Kit
- Validation and API docs: DTOs, class-validator, class-transformer, Swagger
- Authentication: JWT with hashed passwords
- AI: OpenAI for MVP behind a replaceable provider interface
- Testing: Jest, Supertest, and Playwright
- Runtime and deployment: Docker, Docker Compose, and Railway

Codex should act as an AI-native software engineering assistant.

Codex should help with:

- Understanding existing code
- Inspecting project structure
- Creating implementation plans
- Writing code
- Refactoring code
- Writing tests
- Reviewing git diffs
- Finding edge cases
- Checking performance risks
- Checking security risks
- Improving maintainability
- Writing documentation
- Creating PR descriptions

Codex must prioritize correctness, simplicity, maintainability, testability, and production safety.

---

## Canonical Documents and Precedence

1. `PRD_AI_Sales_Assistant_for_UMKM.md` is the canonical product, API, validation, schema, security, and acceptance-criteria specification.
2. `CLAUDE.md` is the canonical implementation architecture and repository convention guide.
3. `AGENTS.md` defines execution guardrails for coding agents.
4. When wording conflicts, explicit architecture decisions in PRD sections 9.2-9.10 and Appendix C take precedence over older recommended or optional wording.
5. Docker is mandatory for the MVP even if an older section describes it as optional.

Before implementing a module, read its relevant PRD sections and the architecture decisions in `CLAUDE.md`.

For every frontend task, `FRONTEND_DEVELOPMENT_PLAN.md` is the mandatory execution tracker. Update the active part to `IN_PROGRESS` before editing frontend source files. After implementation and verification, record evidence, mark the part `COMPLETE`, and activate the next part in the same plan update before continuing.

---

## Mandatory Project Architecture

### Identity and Authorization

- Public chatbot routes identify businesses by unique URL-safe `businessSlug`; never expose internal user or business-profile UUIDs as public routing identifiers.
- Public chat sessions use a cryptographically random access token. Store only its SHA-256 hash and expiration, and require `X-Chat-Session-Token` for public message and history access.
- Public WhatsApp routes use `businessSlug`; requests that attach chat or lead context must verify the matching session token.
- Private dashboard routes derive the current business profile from the validated JWT.
- Never accept `userId` or `businessProfileId` from a private request DTO to select ownership.
- Scope every private repository read and write by both resource ID and authenticated business profile ID.
- The MVP supports one business profile per user and must enforce that rule in the database.

### Data Integrity and Idempotency

- Normalize Indonesian phone inputs from `08...`, `628...`, or `+628...` to canonical `62...` before storage, comparison, duplicate checks, or WhatsApp URL generation.
- Enforce a unique lead constraint on `(business_profile_id, phone)`; application pre-checks do not replace the database constraint.
- Require a UUID `clientMessageId` for customer messages and enforce uniqueness on `(chat_session_id, client_message_id)`.
- Link each assistant response to its customer message with a unique `reply_to_message_id` so retries can return the stored response.
- Coordinate `processing_status` with `pending`, `completed`, and `failed` values plus an atomic processing claim.
- Completed retries return the stored result; concurrent pending retries must not start a parallel AI call.
- A stale claim may be resumed, but database responses and lead side effects must remain idempotent because provider execution cannot be guaranteed exactly once after a process crash.
- Declare foreign-key nullability and delete behavior explicitly in Drizzle schemas and generated migrations.

### Transactions and External Calls

- Persist a customer message before calling the AI provider.
- Never hold a database transaction open while awaiting the AI provider.
- After the provider returns, persist the assistant response and related lead mutation atomically.
- Persist the Indonesian fallback response when the provider times out or fails.
- Use explicit timeouts for external calls and sanitize provider errors before logging or returning them.

### Performance and Operations

- Use bounded pagination and deterministic ordering for all list and chat-history endpoints.
- Use database aggregate queries for dashboard metrics; do not load complete datasets into memory.
- Implement the composite indexes and unique constraints defined in PRD section 24.4 and verify important queries with generated SQL or `EXPLAIN` where practical.
- Structured stdout/stderr logs with correlation IDs are primary. Database `error_logs` writes are optional and best-effort.
- Demo seed/reset commands must be idempotent, environment-aware, transactional, and unavailable as public HTTP endpoints.
- Shared demo credentials, slug, and core identity must not be editable through the dashboard.
- Only trusted seed code may set `users.is_demo`; never expose that field in registration or update DTOs.

### AI and Containers

- Only the backend may call the AI provider.
- Implement OpenAI as the only required MVP provider behind `ai-provider.interface.ts`.
- Use a deterministic fake AI provider in automated tests; tests must not call a live AI API.
- Backend and frontend Dockerfiles plus root Docker Compose are required and must be included in verification.

---

## Core Working Rules

Codex must follow these rules:

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

Before implementation, Codex should inspect the codebase and return:

1. Understanding of the task
2. Related files
3. Existing patterns
4. Recommended implementation location
5. Implementation plan
6. Test plan
7. Risks and assumptions

Codex should not change files during the exploration phase.

---

## Architecture Rules

Codex must follow the existing architecture of the project.

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

When working on backend code, Codex should check:

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

Codex should avoid:

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

When working on frontend code, Codex should check:

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

Codex should avoid:

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

When working with APIs, Codex should check:

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

For this project, API review must also verify:

1. Public business resolution uses `businessSlug`.
2. Public chat session access verifies `X-Chat-Session-Token`.
3. Private resource access is ownership-scoped from JWT identity.
4. Chat writes use `clientMessageId` plus an atomic processing-state claim.
5. Pagination has a documented default, maximum limit, and deterministic ordering.

Codex should not change existing API contracts unless explicitly requested.

If an API contract must change, Codex should explain:

1. What changes
2. Why it changes
3. What can break
4. Migration plan
5. Test plan

---

## Database Rules

When working with database logic, Codex should check:

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

Project-specific database checks:

1. Unique `business_profiles.slug` and `business_profiles.user_id` constraints.
2. Unique `(business_profile_id, phone)` lead constraint after phone normalization.
3. Unique `(chat_session_id, client_message_id)` message constraint.
4. Unique non-null `reply_to_message_id` for assistant responses.
5. Atomic transitions for message processing status and stale-claim recovery.
6. Composite indexes from PRD section 24.4.
7. Explicit foreign-key delete behavior.
8. No transaction remains open during an AI network call.

Codex should avoid:

1. Unbounded queries
2. Loading unnecessary fields
3. N+1 query patterns
4. Schema changes without explanation
5. Data migrations without rollback plan
6. Unsafe destructive operations

If modifying database schema, Codex should explain:

1. Schema change
2. Reason
3. Backward compatibility
4. Migration plan
5. Rollback plan
6. Test plan

---

## Worker / Background Job Rules

When working with workers, queues, cron jobs, or background processing, Codex should check:

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

Codex should avoid:

1. Letting one failed item stop the entire batch unless required
2. Infinite retries without control
3. Large synchronous loops for huge data
4. Missing logs for failed jobs
5. Duplicate side effects
6. Hidden failures

---

## Testing Rules

For every new feature or bug fix, Codex should add or suggest tests.

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

Codex should identify missing tests before finalizing implementation.

Mandatory project-specific coverage includes cross-owner access denial, public slug lookup, missing or invalid chat session tokens, phone normalization, concurrent duplicate leads, completed duplicate message retries, concurrent pending message requests, stale claim recovery, AI timeout fallback persistence, pagination bounds and ordering, demo reset idempotency, migrations from an empty database, and Docker image startup.

---

## Security Rules

Codex must check security risks when touching:

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

Codex should check for:

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

Codex must not hardcode secrets, API keys, passwords, or tokens.

---

## Performance Rules

Codex must consider performance when touching:

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

Codex should check:

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

Codex should explain performance risks and propose safer alternatives.

---

## Error Handling Rules

Codex should ensure errors are handled clearly.

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

Codex should avoid silent failures.

---

## Logging and Monitoring Rules

When adding or changing important flows, Codex should consider logging.

Logs should help answer:

1. What happened?
2. Which operation failed?
3. Which entity was affected?
4. Why did it fail?
5. Is it retryable?
6. What should be checked next?

For this project, structured stdout/stderr logging with a correlation ID is required. Database error logging is supplemental and must never be the only record of a failure or cause recursive error handling.

Codex should avoid logging:

1. Passwords
2. Tokens
3. API keys
4. Payment secrets
5. Sensitive personal data
6. Full request body when it may contain private data

---

## Dependency Rules

Codex should not add dependencies unless necessary.

Before adding a dependency, Codex must explain:

1. Why it is needed
2. What problem it solves
3. Why existing code cannot solve it
4. Bundle size or runtime impact
5. Security and maintenance risk
6. Alternative options

Prefer native or existing project utilities when reasonable.

---

## Refactoring Rules

Codex may suggest refactoring when it improves:

1. Readability
2. Testability
3. Maintainability
4. Performance
5. Security
6. Duplication reduction

Codex should avoid unrelated refactors during feature work.

For refactoring, Codex should explain:

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

Codex should not run destructive git commands unless explicitly requested.

Avoid:

```bash
git reset --hard
git clean -fd
git push --force
```

---

## Command Rules

Codex may suggest or run safe commands that are already part of the project workflow.

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

Codex should inspect `package.json`, project config, or documentation before assuming commands.

Codex should not run destructive commands unless explicitly requested.

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

Codex should update documentation when changes affect:

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

When asked to create a PR description, Codex should use this format:

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

For every engineering task, Codex should respond with:

1. Understanding
2. Related files
3. Existing patterns
4. Implementation plan
5. Risks and assumptions
6. Test plan
7. Suggested next step

After making code changes, Codex should respond with:

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

Before considering a task complete, Codex should verify:

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
