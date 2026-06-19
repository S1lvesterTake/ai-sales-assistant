# Skill: Code Review Agent

## Trigger
Use this skill when asked to review a module, file, or PR diff in this project.

**Trigger phrases:** "review module [X]", "check this file", "audit [feature]", "ada masalah ga di [X]", "review PR ini"

---

## Review Workflow

### Step 1: Inventory (do this before any analysis)

Read these files in order:
1. The target file(s) specified by the user
2. Any file imported by the target (repositories, services, DTOs it depends on)
3. `docs/AGENTS.md` — keep constraints fresh in context
4. The corresponding test file (`*.spec.ts`) if it exists

Do not start writing review comments until you have read all relevant files.

---

### Step 2: Run the 6-Lens Review

For each file being reviewed, check all lenses. Report findings per lens, not per file.

---

## Lens 1: Security Correctness 🔐

**This lens is non-negotiable. Any finding here blocks merge.**

Check for:

### Ownership enforcement
- [ ] Is `businessProfileId` derived from `@CurrentUser()`, never from request DTO?
  ```typescript
  // ❌ BLOCK MERGE
  where(eq(schema.leads.businessProfileId, dto.businessProfileId))
  
  // ✅ Correct
  where(eq(schema.leads.businessProfileId, user.businessProfileId))
  ```

### Auth guard
- [ ] Is `@UseGuards(JwtAuthGuard)` present at the **controller class level** on every protected controller?
- [ ] Is any endpoint that handles private dashboard data missing the guard?

### Exposed internals
- [ ] Do response DTOs expose `userId`, `businessProfileId`, `is_demo`, `access_token_hash`?
- [ ] Are JWT tokens returned anywhere except `POST /api/auth/login`?

### Input trust
- [ ] Are all inputs validated by class-validator DTOs at the API boundary?
- [ ] Is `req.body` passed raw to any service?

### Secrets
- [ ] Any `process.env.X` in business logic? (Should use `ConfigService.getOrThrow()`)
- [ ] Any hardcoded secrets, API keys, or credentials?

### AI calls
- [ ] Any AI provider call in frontend code? (Must go through backend `modules/ai/`)

### Public chat routes
- [ ] Do public endpoints verify `X-Chat-Session-Token` against `access_token_hash`?

---

## Lens 2: Architectural Compliance 🏗️

Check layering rules from AGENTS.md:

- [ ] Controllers call only services — never repositories or DatabaseService
- [ ] Services call only repositories — never DatabaseService directly
- [ ] Only `*.repository.ts` files import `DatabaseService`
- [ ] Schema imported from `schema/index.ts`, never individual schema files
- [ ] Slug lookups use `resolveBusinessBySlug` from `common/utils/slug.ts`

Check transaction rules:
- [ ] No open DB transaction during an AI provider call
- [ ] Correct order: persist customer message → commit → call AI → new transaction → persist response

---

## Lens 3: Functional Correctness ✅

- [ ] Does the implementation match the PRD spec for this feature?
- [ ] Are all edge cases handled? (empty lists, not found, conflict)
- [ ] Are NestJS exceptions used correctly?
  ```typescript
  // ❌ Never
  throw new Error('Not found')
  
  // ✅ Always
  throw new NotFoundException({ success: false, message: '...', error: 'NOT_FOUND' })
  ```
- [ ] Pagination: bounded page size, deterministic ordering on all list endpoints?
- [ ] Idempotency: duplicate `clientMessageId` handled for chat messages?
- [ ] Phone normalization: Indonesian phone inputs normalized to `62...` format?

---

## Lens 4: Code Quality & Convention 📐

DTOs:
- [ ] Every property has both `@ApiProperty()` and a class-validator decorator
- [ ] Update DTOs use `PartialType(CreateXxxDto)`, not re-declared fields
- [ ] File names follow `create-{resource}.dto.ts` pattern

Controllers:
- [ ] `@ApiTags()` on class
- [ ] `@ResponseMessage()` on every handler
- [ ] `@ApiOkResponse({ type: XxxResponseDto })` on every GET

File naming — kebab-case for all backend files (`chat-session.service.ts`, not `chatSession.service.ts`)

No `any` types on API boundaries. No `object`. No untyped body.

---

## Lens 5: Performance & Scaling ⚡

- [ ] N+1 queries: are list endpoints loading relations in a loop instead of a JOIN?
  ```typescript
  // ❌ N+1
  const leads = await repo.findAll();
  for (const lead of leads) {
    lead.messages = await messageRepo.findByLead(lead.id);
  }
  
  // ✅ JOIN at query level
  const leads = await repo.findAllWithMessages();
  ```
- [ ] Missing indexes: any `WHERE` clause on a column without an index?
- [ ] Full table scans: any query without `businessProfileId` scoping that could return all rows?
- [ ] Dashboard metrics: computed via DB aggregates, not in-memory array operations?
- [ ] Unbounded queries: any list endpoint missing `LIMIT`?

---

## Lens 6: Test Coverage 🧪

- [ ] Does the spec file exist alongside the service?
- [ ] Are happy path and error cases both covered?
- [ ] Are edge cases tested (empty input, boundary values, conflict scenarios)?
- [ ] Do tests assert the correct `businessProfileId` scoping (not just that a result was returned)?
- [ ] Any coverage-padding tests (tests that call the function but don't assert meaningful behavior)?

---

## Output Format

Structure your review report as:

```markdown
## Code Review: [Module/File Name]

### 🔐 Security — [PASS / ⚠️ WARNING / ❌ BLOCK]
[Findings or "No issues found"]

### 🏗️ Architecture — [PASS / ⚠️ WARNING / ❌ BLOCK]
[Findings or "No issues found"]

### ✅ Functional Correctness — [PASS / ⚠️ WARNING]
[Findings or "No issues found"]

### 📐 Code Quality — [PASS / ⚠️ WARNING]
[Findings or "No issues found"]

### ⚡ Performance — [PASS / ⚠️ WARNING]
[Findings or "No issues found"]

### 🧪 Test Coverage — [PASS / ⚠️ WARNING / ❌ BLOCK]
[Findings or "No issues found"]

---

### Summary
**Merge status:** READY / NEEDS CHANGES / BLOCK

**Must fix before merge:**
- [List blocking items only]

**Should fix (non-blocking):**
- [List warnings]

**Suggested improvements (optional):**
- [Nice-to-haves]
```

---

## Severity Definitions

| Severity | Label | Meaning |
|---|---|---|
| ❌ BLOCK | Security bug or architectural violation | Must fix before merge. CI should not pass. |
| ⚠️ WARNING | Code quality, missing tests, performance risk | Should fix; can merge with explicit acknowledgment |
| 💡 SUGGESTION | Improvement opportunity | Optional, no urgency |

---

## Escalation Rule

If you find **any Security lens issue (❌ BLOCK)**, stop the review immediately and surface it at the top of your report before continuing the other lenses. A security bug is more urgent than any style or performance finding.