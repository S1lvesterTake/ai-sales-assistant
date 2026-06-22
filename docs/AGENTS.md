# AGENTS.md

## 1. Stack Declaration

| Layer | Version | Key Path |
|---|---|---|
| Node.js | 24.15.0 (engine: `>=24 <25`) | `backend/Dockerfile` |
| NestJS | ^11.0.1 | `backend/src/` |
| Next.js | 16.2.9 — **breaking changes from earlier versions** | `frontend/` |
| Drizzle ORM | ^0.45.2 | schema barrel: `backend/src/database/schema/index.ts` |
| Drizzle Kit | ^0.31.10 | config: `backend/drizzle.config.ts` |
| PostgreSQL | 16 | managed by Railway plugin / Docker Compose |

**Auth pattern:**
- Strategy: `backend/src/modules/auth/jwt.strategy.ts`
- Guard: `backend/src/common/guards/jwt-auth.guard.ts`
- Apply `@UseGuards(JwtAuthGuard)` at the **controller class level**, never on individual methods.
- Current user: inject via `@CurrentUser()` decorator → `backend/src/common/decorators/current-user.decorator.ts`

**DB access pattern:**
- Inject `DatabaseService` from `backend/src/database/database.service.ts`.
- Access the Drizzle instance as `this.database.db`.
- **Only repository files** (`*.repository.ts`) may import `DatabaseService`. Services and controllers never touch Drizzle directly.
- All table schemas are exported from `backend/src/database/schema/index.ts` — import from there, never from individual schema files.

---

## 2. Architectural Constraints

Hard rules — no exceptions without explicit instruction.

**Ownership**
- NEVER accept `userId` or `businessProfileId` from a request DTO to determine ownership.
  - ❌ `{ businessProfileId: dto.businessProfileId }` in a private handler
  - ✅ `{ businessProfileId: user.businessProfileId }` from `@CurrentUser()`
- ALWAYS scope private repository reads and writes by `AND business_profile_id = :profileId` even when an explicit resource ID is supplied.

**Layering**
- NEVER call a repository from a controller. Controllers call services; services call repositories.
- NEVER import `DatabaseService` or Drizzle in a service or controller file.
- NEVER inline a business-slug DB lookup. Use `resolveBusinessBySlug` / `resolveBusinessWithWhatsappBySlug` from `backend/src/common/utils/slug.ts`.

**Transactions and AI calls**
- NEVER hold an open database transaction while awaiting the AI provider.
  - ✅ Correct order: persist customer message → commit → call AI → open new transaction → persist response + lead update → commit.
- NEVER call any AI provider API from the frontend. All AI calls go through `backend/src/modules/ai/`.

**Chat idempotency**
- NEVER start a parallel AI call when `processing_status = 'pending'` for the same message. Return the pending claim response instead.
- ALWAYS return the stored assistant response for a duplicate `clientMessageId` when `processing_status = 'completed'`.

**Migrations**
- NEVER edit an existing migration SQL file. Generate a new one with `npm run db:generate`.
- NEVER use `db:push` outside local development.

---

## 3. Forbidden Patterns

### Raw SQL queries
❌ `this.database.db.execute(sql\`SELECT * FROM products WHERE id = ${id}\`)`
✅ `this.database.db.select().from(schema.products).where(eq(schema.products.id, id))`

### `any` type on API boundaries
❌ `async createProduct(data: any)`
✅ All controller inputs must be typed DTOs with class-validator decorators. No `any`, no `object`, no untyped `body`.

### Hardcoded config values
❌ `const ttl = 86400` or `const secret = 'dev-secret'`
✅ `this.config.getOrThrow<number>('CHAT_SESSION_TTL')` — all values flow through `ConfigService`.

### Throwing plain `Error` in NestJS
❌ `throw new Error('Not found')`
✅ `throw new NotFoundException({ success: false, message: 'Produk tidak ditemukan.', error: 'NOT_FOUND' })`

### Non-idempotent INSERT in retry-eligible paths
❌ `db.insert(schema.leads).values(data)` where a duplicate could arrive
✅ Use `onConflictDoUpdate` or SELECT → INSERT pattern guarded by the unique constraint

### Direct `process.env` access in business logic
❌ `const key = process.env.OPENAI_API_KEY`
✅ Inject `ConfigService` and call `this.config.getOrThrow<string>('OPENAI_API_KEY')`

---

## 4. Code Style Rules

### DTO conventions
- File names: `create-{resource}.dto.ts`, `update-{resource}.dto.ts`, `{resource}-response.dto.ts`, `{resource}-query.dto.ts`
- Location: `backend/src/modules/{feature}/dto/`
- Every DTO property **must** have both:
  - A Swagger decorator: `@ApiProperty()` or `@ApiPropertyOptional()`
  - A class-validator decorator: `@IsString()`, `@IsInt()`, `@IsOptional()`, etc.
- Update DTOs use `PartialType(CreateXxxDto)` — never re-declare fields manually.

### Controller conventions
Every NestJS controller must have:
- `@ApiTags('Resource Name')` on the class
- `@ResponseMessage('Human-readable message')` on every handler
- `@ApiOkResponse({ type: XxxResponseDto })` on every GET handler
- `@UseGuards(JwtAuthGuard)` at the class level for any protected controller

### Error conventions
Use NestJS built-in exceptions only: `NotFoundException`, `ForbiddenException`, `UnauthorizedException`, `ConflictException`, `UnprocessableEntityException`. Always pass the structured object:
```ts
throw new NotFoundException({ success: false, message: '...', error: 'NOT_FOUND' });
```

### File naming
| Context | Convention | Example |
|---|---|---|
| Backend source | `kebab-case.ts` | `chat-processing.service.ts` |
| Frontend component | `kebab-case.tsx` | `lead-capture-form.tsx` |
| Frontend utility | `kebab-case.ts` | `server-settings.ts` |
| Unit test | `*.spec.ts` | `auth.service.spec.ts` |
| Integration test | `*.integration-spec.ts` | `leads.integration-spec.ts` |
| E2E test | `*.e2e-spec.ts` | `app.e2e-spec.ts` |

---

## 5. Tool Usage Rules

| Action | Rule |
|---|---|
| Create a new file | Only if no existing file can be extended. State the reason. |
| Edit an existing file | **Read the full file first.** Do not write to a file not read in the current session. |
| Delete a file | Ask before deleting. **Never delete migration files** (`backend/src/database/migrations/`). |
| Run shell commands | Only `package.json` scripts and read-only git commands (`git status`, `git diff`, `git log`). |
| Run destructive commands | Never run `rm -rf`, `git reset --hard`, `git clean -fd`, `git push --force`, `npm audit fix --force` without explicit instruction. |
| Modify migrations | NEVER edit existing `.sql` migration files. Generate a new migration with `npm run db:generate`. |
| Run tests | `npm test` (unit), `npm run test:integration` (integration), `npm run test:e2e` (E2E). Always run from the correct subdirectory (`backend/` or `frontend/`). |

---

## 6. Security Rules

Non-negotiable — violations block merge.

- **NEVER** expose `users.is_demo`, `access_token_hash`, or internal UUIDs (`userId`, `businessProfileId`) in public API response DTOs.
- **NEVER** trust client-supplied ownership identifiers. Derive `businessProfileId` from `@CurrentUser()` on every private route.
- **NEVER** return JWT or session tokens in a response body except in the `POST /api/auth/login` response shape.
- **NEVER** log passwords, tokens, API keys, `access_token_hash`, or full request bodies that may contain credentials.
- **NEVER** call the AI provider from the frontend — all AI calls go through the backend module.
- **ALWAYS** validate with class-validator DTO at the API boundary. Do not pass `req.body` raw to a service.
- **ALWAYS** use `ConfigService.getOrThrow<T>()` for secrets — never `process.env.X` in business logic files.
- **JWT guard is mandatory** on every protected controller. A controller that handles private dashboard data without `@UseGuards(JwtAuthGuard)` is a security bug, not a style issue.
- **Public chat routes** MUST verify `X-Chat-Session-Token` against the stored `access_token_hash` — trusting the session UUID alone is not authorization.
- **Demo field `users.is_demo`** may only be set by seed code — never expose it in a registration or update DTO.

---

## 7. MCP Tool Inventory

### Project-Specific MCPs
No project-specific MCP servers are configured for this repo.

### Session-Level MCPs (available but not project-specific)

| MCP | When to use | Trigger Phrases |
|---|---|---|
| Filesystem MCP | Browse project files, read multiple files for context gathering | "buka file", "baca semua file di", "show me files in" |
| PostgreSQL MCP | Query DB directly for debugging or data inspection | "query DB", "cek data di tabel", "how many leads" |
| Gmail | Reading or sending email (out-of-band notifications, not in code) | "check email", "send email to", "any reply from" |
| Google Calendar | Scheduling tasks or reading calendar state | "check my calendar", "schedule meeting" |
| Google Drive | Reading/writing documents or specs stored on Drive | "open the Drive doc", "update spec on Drive" |
| Notion | Reading or updating project Notion pages | "update Notion", "check action plan", "look at the Notion page" |

**Rules:**
- Always use **least-privilege** when requesting MCP permissions. Request read-only access unless write is explicitly needed.
- Do NOT use session MCPs for code generation tasks. They are for context and data retrieval only.
- Document any new MCP added here before using it in a session.

---

## 8. Effective Prompting Patterns

_Filled progressively after sessions. Record what produced correct output and what caused drift._

**Patterns that work:**
- ✅ Asking for an exploration report (related files, existing patterns, risks) before implementation keeps changes minimal and on-pattern.
- ✅ Specifying the exact file path and the specific problem produces targeted edits without unrelated refactors.
- ✅ "Fix only X, do not touch Y" scoping prevents scope creep in large files.

**Patterns that cause drift:**
- ⚠️ "Improve this file" without scope → causes large rewrites. Always name the file and the specific problem.
- ⚠️ "Add tests" without specifying which behavior to cover → produces coverage-padding tests rather than behavior tests.
- ⚠️ Asking to "refactor and add feature" in the same prompt → mixing refactor and behavior change makes diffs hard to review. Split into two requests.

---

## 9. Skill Files

Reusable prompt templates for common agentic workflows. Invoke the relevant skill file before starting the task by telling Claude Code: `"Read skills/[name].md, then proceed with the task."`

| Skill | File | Use When |
|---|---|---|
| Create NestJS Module | `skills/nestjs-module.md` | Scaffolding any new feature module |
| Drizzle Migration | `skills/drizzle-migration.md` | Any schema change or new table |
| Code Review | `skills/code-review.md` | Reviewing a module, file, or PR diff |

**Adding a new skill:**
1. Create `skills/{name}.md`
2. Add an entry to this table
3. Include in the file: trigger phrases, pre-checklist, rules specific to this project, and expected output format

---

## Canonical Documents and Precedence

1. `PRD_AI_Sales_Assistant_for_UMKM.md` — canonical product, API, validation, schema, security, and acceptance-criteria specification.
2. `CLAUDE.md` — canonical implementation architecture and repository convention guide.
3. `AGENTS.md` — execution guardrails for coding agents (this file).
4. When wording conflicts, explicit architecture decisions in PRD sections 9.2–9.10 and Appendix C take precedence over older recommended or optional wording.
5. Docker is mandatory for the MVP even if an older section describes it as optional.

Before implementing any module, read its relevant PRD sections and the architecture decisions in `CLAUDE.md`.

For every frontend task, `FRONTEND_DEVELOPMENT_PLAN.md` is the mandatory execution tracker. Mark the active part `IN_PROGRESS` before editing frontend source files. After implementation and verification, record evidence, mark `COMPLETE`, and activate the next part before continuing.

---

## Mandatory Project Architecture

### Identity and Authorization

- Public chatbot routes identify businesses by `businessSlug`; never expose internal UUIDs as public routing identifiers.
- Public chat sessions use a cryptographically random access token. Store only its SHA-256 hash and expiration. Require `X-Chat-Session-Token` for public message and history access.
- Public WhatsApp routes use `businessSlug`; requests that attach chat or lead context must verify the matching session token.
- Private dashboard routes derive the current business profile from the validated JWT only.
- The MVP supports one business profile per user — enforced by a unique constraint on `business_profiles.user_id`.

### Data Integrity and Idempotency

- Normalize Indonesian phone inputs (`08...`, `628...`, `+628...`) to canonical `62...` before storage, comparison, or WhatsApp URL generation.
- Enforce a unique lead constraint on `(business_profile_id, phone)` at the database level — application pre-checks do not replace it.
- Require UUID `clientMessageId` per customer message; enforce uniqueness on `(chat_session_id, client_message_id)`.
- Link each assistant response to its customer message with a unique `reply_to_message_id` so retries return the stored result.
- Coordinate `processing_status` (`pending` / `completed` / `failed`) with an atomic processing claim and stale-claim recovery.

### Transactions and External Calls

- Persist the customer message before calling the AI provider.
- Never hold a DB transaction open during the AI call.
- After the provider returns, persist the assistant response and lead mutation atomically.
- Persist the Indonesian fallback response when the provider times out or fails.

### Operations

- Bounded pagination and deterministic ordering on all list and chat-history endpoints.
- Dashboard metrics via DB aggregate queries — never load full datasets into memory.
- Composite indexes and unique constraints per PRD section 24.4.
- Structured stdout/stderr logs with correlation IDs are primary. DB `error_logs` writes are best-effort supplemental.
- Demo seed/reset commands are idempotent, environment-aware, transactional, and never reachable as public HTTP endpoints.
- Demo credentials, slug, and core identity cannot be changed through the dashboard. Only seed code sets `users.is_demo`.


## 10. Post-Implementation Workflow (Mandatory)

After every implementation or fix, Claude MUST execute this sequence without being asked:

### Step 1 — Test
```bash
# From the correct subdirectory (backend/ or frontend/)
npm test
npm run typecheck
npm run lint
```
If any step fails: fix the failure first. Do not proceed to Step 2 until all checks pass.

### Step 2 — Commit
```bash
git add -p          # stage only files changed in this task
git status          # confirm staged files match the task scope
git commit -m "[type]: [short description]"
```
Commit message format: `feat:`, `fix:`, `test:`, `chore:`, `refactor:` — never `misc:` or `update:`.
Never stage unrelated files. Never commit with `git add .` without reading `git status` first.

### Step 3 — Push & Open PR
```bash
git push origin HEAD
```
Then create a PR via GitHub CLI:
```bash
gh pr create \
  --title "[type]: [description]" \
  --body "$(cat .github/pull_request_template.md)" \
  --base main \
  --draft
```
Open as **draft** by default. Only mark ready when explicitly instructed.

### Step 4 — Self-Review (Vibe Diff)
Before finishing, Claude must read every file it changed and answer:
- [ ] Any security issue introduced? (missing guard, client-supplied ownership, exposed secret)
- [ ] Any architectural violation? (controller → repository, direct DB in service)
- [ ] Does this match the task intent, not just the literal prompt?

Report findings inline. If any checklist item is YES: fix before marking task complete.


## 11. Feature Implementation Order (Mandatory)

When implementing any new feature, always follow this exact sequence:

1. Read the feature spec in docs/
2. Read the relevant schema files in database/schema/
3. Read one existing module as pattern reference (products/ for CRUD)
4. Implement: repository → DTOs → service → controller → module
5. Write tests alongside each file (not after)
6. Run: typecheck → test → test:cov → lint
7. Follow Post-Implementation Workflow (Section 10)

Never skip steps. Never implement controller before repository.