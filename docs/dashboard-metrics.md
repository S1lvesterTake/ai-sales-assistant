# Dashboard Metrics — Feature Spec

> Ground truth: all column names, query logic, and response shapes in this spec are derived
> directly from the schema files and existing implementation. Nothing is invented.

---

## 1. Overview

The dashboard metrics feature gives authenticated business owners a real-time summary of their
sales pipeline and engagement activity. Rather than requiring owners to manually tally leads,
count conversations, or track WhatsApp handoffs, the dashboard surfaces aggregate counts and
recent activity in a single authenticated request. For an Indonesian UMKM owner running a
solo operation, the summary widget answers the three questions that matter most at a glance:
how many people have expressed interest (leads), how many are still uncontacted (new), and
whether the AI chatbot is actively driving conversations toward WhatsApp handoffs (click events).
The widget endpoints (recent leads, recent conversations, top questions, conversation messages)
give the owner enough context to act without leaving the dashboard.

---

## 2. Endpoints

All endpoints are under the `/api/dashboard` path prefix, enforced at the controller level by
`@UseGuards(JwtAuthGuard)`. No individual method override is permitted.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/dashboard/summary` | JWT required | Aggregate counts for the owner's business: total leads, new leads, total chat sessions, WhatsApp clicks |
| `GET` | `/api/dashboard/recent-leads` | JWT required | Last N leads ordered by `created_at DESC`, N defaults to 5, max 20 |
| `GET` | `/api/dashboard/recent-conversations` | JWT required | Last N chat sessions with their most recent customer message, ordered by session `created_at DESC` |
| `GET` | `/api/dashboard/top-questions` | JWT required | Most frequently repeated customer messages across all sessions, ranked by frequency |
| `GET` | `/api/dashboard/conversations/:sessionId/messages` | JWT required | Paginated message history for a specific session, verified to belong to the authenticated owner |

---

## 3. Response Shapes

The global `ResponseInterceptor` wraps every successful response in the standard envelope.
Shapes below show the final wire format.

### 3.1 `GET /api/dashboard/summary`

```json
{
  "success": true,
  "message": "Dashboard summary retrieved",
  "data": {
    "totalLeads": 42,
    "newLeads": 12,
    "totalChatSessions": 156,
    "whatsappClicks": 89
  }
}
```

Field definitions (all counts are all-time, scoped to the authenticated owner's `business_profile_id`):

| Field | Source table | Condition |
|-------|-------------|-----------|
| `totalLeads` | `leads` | `WHERE business_profile_id = :id` |
| `newLeads` | `leads` | `WHERE business_profile_id = :id AND status = 'new'` |
| `totalChatSessions` | `chat_sessions` | `WHERE business_profile_id = :id` |
| `whatsappClicks` | `whatsapp_click_events` | `WHERE business_profile_id = :id` |

### 3.2 `GET /api/dashboard/recent-leads`

Query params: `limit` (integer, 1–20, default 5).

```json
{
  "success": true,
  "message": "Recent leads retrieved",
  "data": [
    {
      "id": "019b9d80-7a2e-7b4b-8dc1-7a44b6300200",
      "name": "Budi",
      "phone": "6281234567890",
      "status": "new",
      "createdAt": "2026-06-15T14:00:00.000Z"
    }
  ]
}
```

`name` may be `null` (the column is nullable in the schema). `status` is one of: `new`,
`contacted`, `qualified`, `closed`, `lost`. `createdAt` is the ISO-8601 string of
`leads.created_at`. Results are ordered by `created_at DESC, id DESC`.

### 3.3 `GET /api/dashboard/recent-conversations`

Query params: `limit` (integer, 1–20, default 5).

```json
{
  "success": true,
  "message": "Recent conversations retrieved",
  "data": [
    {
      "sessionId": "019b9d80-7a2e-7b4b-8dc1-7a44b6300100",
      "customerName": "Siti",
      "lastMessage": "Halo, ada menu apa hari ini?",
      "lastMessageAt": "2026-06-15T14:00:00.000Z"
    }
  ]
}
```

`customerName` may be `null` (nullable in `chat_sessions.customer_name`). `lastMessage`
is the `message` text of the most recent `role = 'customer'` row in `chat_messages` for
the session. If no customer message exists yet, `lastMessage` is `""` and `lastMessageAt`
falls back to the session's own `created_at`. Sessions are ordered by `chat_sessions.created_at DESC`.

### 3.4 `GET /api/dashboard/top-questions`

Query params: `limit` (integer, 1–20, default 5).

```json
{
  "success": true,
  "message": "Top questions retrieved",
  "data": [
    {
      "question": "Apakah bisa pesan untuk acara?",
      "count": 15
    }
  ]
}
```

`question` is the exact `chat_messages.message` text. `count` is the integer frequency
across all sessions belonging to the business. Only `role = 'customer'` messages are
counted. Results are ordered by `count DESC`.

### 3.5 `GET /api/dashboard/conversations/:sessionId/messages`

Query params: `page` (integer ≥ 1, default 1), `limit` (integer 1–100, default 20).

```json
{
  "success": true,
  "message": "Conversation messages retrieved",
  "data": [
    {
      "id": "019b9d80-7a2e-7b4b-8dc1-7a44b6300300",
      "role": "customer",
      "message": "Berapa harganya?",
      "createdAt": "2026-06-15T14:01:00.000Z",
      "clientMessageId": "b1c2d3e4-f5a6-7890-abcd-ef1234567890",
      "replyToMessageId": null,
      "processingStatus": "completed"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 47,
    "totalPages": 3
  }
}
```

`role` is one of: `customer`, `assistant`, `system`. `clientMessageId` and `replyToMessageId`
are UUIDs or `null`. `processingStatus` is one of: `pending`, `completed`, `failed`, or `null`
(null for assistant and system roles per the schema check constraint).

---

## 4. Metrics Definition

### 4.1 Total Leads (all-time)

- **Measures:** Count of all lead records ever created for the business.
- **Table:** `leads`
- **Column(s):** `business_profile_id`, `id`
- **Query:** `COUNT(*) WHERE business_profile_id = :id`
- **Time range:** All-time (no date filter).
- **Zero state:** Returns `0`. The summary object always includes all four fields; no field is
  omitted when data is absent.

### 4.2 New Leads (all-time, status = 'new')

- **Measures:** Count of leads that have not yet been contacted — a direct proxy for the
  owner's current action queue.
- **Table:** `leads`
- **Column(s):** `business_profile_id`, `status`
- **Query:** `COUNT(*) WHERE business_profile_id = :id AND status = 'new'`
- **Time range:** All-time (no date filter).
- **Zero state:** Returns `0`.

### 4.3 Lead Conversion Rate — **NOT YET IMPLEMENTED; spec defines target behaviour**

- **Measures:** Ratio of leads that advanced to `status = 'contacted'` relative to total leads.
  Formula: `COUNT(WHERE status = 'contacted') / COUNT(*) * 100`, expressed as a percentage
  rounded to one decimal place.
- **Table:** `leads`
- **Column(s):** `business_profile_id`, `status`
- **Query (target):**
  ```sql
  SELECT
    COUNT(*) FILTER (WHERE status = 'contacted') AS contacted,
    COUNT(*) AS total
  FROM leads
  WHERE business_profile_id = :id
  ```
  Compute `(contacted / total * 100)` in application code; return `0` when `total = 0`.
- **Time range:** All-time (no date filter). A future enhancement may scope to last 30 days.
- **Zero state:** Returns `conversionRate: 0` when `total = 0` (avoid divide-by-zero in code).
- **Implementation gap:** This field is not present in the current `DashboardSummaryDto` or
  `DashboardRepository.getSummary()`. It must be added to both.

### 4.4 Total Chat Sessions (all-time)

- **Measures:** Count of all chat sessions ever started for the business.
- **Table:** `chat_sessions`
- **Column(s):** `business_profile_id`, `id`
- **Query:** `COUNT(*) WHERE business_profile_id = :id`
- **Time range:** All-time (no date filter in current implementation).
- **Zero state:** Returns `0`.
- **Note:** A future enhancement should add a `totalChatSessionsLast30Days` field using
  `created_at >= NOW() - INTERVAL '30 days'`. The current implementation returns all-time.

### 4.5 Total WhatsApp Clicks (all-time)

- **Measures:** Count of WhatsApp link click events recorded for the business.
- **Table:** `whatsapp_click_events`
- **Column(s):** `business_profile_id`, `id`
- **Query:** `COUNT(*) WHERE business_profile_id = :id`
- **Time range:** All-time (no date filter in current implementation; the column
  `clicked_at` exists and can support last-30-day filtering in a future iteration).
- **Zero state:** Returns `0`.

### 4.6 Recent Leads (last N, default 5)

- **Measures:** The most recently created leads, giving the owner a feed of new interest.
- **Table:** `leads`
- **Column(s) returned:** `id`, `name`, `phone`, `status`, `created_at`
- **Query:** `SELECT id, name, phone, status, created_at FROM leads WHERE business_profile_id = :id ORDER BY created_at DESC, id DESC LIMIT :n`
- **Time range:** No fixed window — the N most recent rows regardless of age.
- **Zero state:** Returns an empty array `[]`. The `data` key is always an array.

### 4.7 Top Products by Chat Mention — **NOT SUPPORTED BY CURRENT SCHEMA**

- **Intended measure:** Products most frequently mentioned in customer messages.
- **Blocker:** `chat_messages.metadata` is an unstructured `jsonb` column. No product
  reference field is defined in the schema. The `chat_messages` table has no foreign key
  or structured field linking a message to a `products.id`.
- **Resolution options (requires schema change):**
  1. Add a `mentioned_product_ids uuid[]` column to `chat_messages` and populate it in
     the AI processing pipeline when the model identifies product mentions.
  2. Add a `product_context jsonb` structured sub-field to `metadata` with a documented
     shape, and query via a JSON path expression.
- **Current status:** This metric cannot be implemented without a schema migration.
  Do not implement or surface it until the schema change is merged and backfilled.

---

## 5. Security Requirements

### Who can access these endpoints

Only the authenticated business owner whose JWT was issued for their `users.id`. Access is
enforced by `JwtAuthGuard` at the controller class level. No individual method may weaken this.

### Ownership scoping

The `businessProfileId` used in every query is resolved exclusively from
`BusinessOwnershipService.findByUserId(userId)`, where `userId` comes from the validated JWT
via `@CurrentUser()`. A `businessProfileId` supplied in a query parameter or request body
must never be used for ownership derivation — doing so is an access-control bypass.

If `findByUserId` returns `null` (the user has no business profile), the service throws
`NotFoundException` with code `BUSINESS_PROFILE_NOT_FOUND`. This is not a 403 — it means
the account exists but setup is incomplete.

For `GET /api/dashboard/conversations/:sessionId/messages`, the session is additionally
verified via `chatRepo.findByIdAndBusiness(sessionId, owner.businessProfileId)` before
messages are returned. A valid session UUID that belongs to a different business returns
`NotFoundException` (not `403`), because the owner has no way to know that UUID exists.

### What must NOT appear in responses

| Field | Reason |
|-------|--------|
| `businessProfileId` | Internal UUID — never expose in response bodies |
| `userId` | Internal UUID |
| `chat_sessions.access_token_hash` | Session secret — single-use hashed token |
| `users.is_demo` | Demo flag — only seed code may set this |
| Any JWT or raw credential | No tokens in response bodies except `POST /api/auth/login` |

---

## 6. Validation Rules

### Query parameters

| Endpoint | Param | Type | Min | Max | Default | On violation |
|----------|-------|------|-----|-----|---------|--------------|
| `recent-leads` | `limit` | integer | 1 | 20 | 5 | 422 Unprocessable Entity |
| `recent-conversations` | `limit` | integer | 1 | 20 | 5 | 422 |
| `top-questions` | `limit` | integer | 1 | 20 | 5 | 422 |
| `conversations/:sessionId/messages` | `page` | integer | 1 | — | 1 | 422 |
| `conversations/:sessionId/messages` | `limit` | integer | 1 | 100 | 20 | 422 |

Non-integer values (e.g. `limit=abc`) are rejected with 422. Fractional values (e.g. `limit=2.5`)
are rejected with 422 (`@IsInt()` + `@Type(() => Number)` enforces this via class-validator
with `transform: true` in the global `ValidationPipe`).

The `sessionId` path parameter is a UUID string. No additional format validation is applied
at the DTO level — an invalid UUID will simply fail the DB lookup and return 404.

### Status codes

| Condition | Code |
|-----------|------|
| No `Authorization` header / invalid token | 401 |
| Valid token but no business profile for this user | 404 (`BUSINESS_PROFILE_NOT_FOUND`) |
| Valid token, valid business, session not found or belongs to another business | 404 (`CONVERSATION_NOT_FOUND`) |
| Invalid query param value | 422 |
| Everything OK | 200 |

There is no 403 in the dashboard module — resource scope is resolved silently via ownership
lookup, not via explicit access-control checks that expose resource existence to other users.

---

## 7. Performance Constraints

### Aggregate queries only

All count metrics in `GET /api/dashboard/summary` are computed with `COUNT(*)` via Drizzle's
`db.$count()` helper. Full rows are never loaded into memory just to call `.length` on the
array. This is a hard rule per `AGENTS.md` section on Operations.

### Query time target

Each individual DB query must complete in under 200ms under normal load. The `getSummary()`
method runs four `COUNT` queries in parallel via `Promise.all()` — total wall time is bounded
by the slowest single count, not their sum.

The `getRecentConversations()` method currently issues one query per session to fetch the
latest customer message (N+1 pattern). For the default limit of 5 this is acceptable. If
the limit is raised or usage grows, this must be refactored to a single JOIN query.

### Required indexes

These indexes exist in the current schema and support the dashboard queries:

| Index name | Table | Columns | Supports |
|-----------|-------|---------|---------|
| `leads_business_status_created_id_idx` | `leads` | `(business_profile_id, status, created_at DESC, id DESC)` | `totalLeads`, `newLeads`, `getRecentLeads` |
| `leads_business_created_id_idx` | `leads` | `(business_profile_id, created_at DESC, id DESC)` | `getRecentLeads` ordering |
| `chat_sessions_business_created_id_idx` | `chat_sessions` | `(business_profile_id, created_at DESC, id DESC)` | `totalChatSessions`, `getRecentConversations` |
| `chat_messages_session_created_id_idx` | `chat_messages` | `(chat_session_id, created_at, id)` | `getRecentConversations` last-message lookup, `getConversationMessages` |
| `whatsapp_events_business_clicked_id_idx` | `whatsapp_click_events` | `(business_profile_id, clicked_at DESC, id DESC)` | `whatsappClicks` |

The `products` table index `products_business_available_created_id_idx` covers
`(business_profile_id, is_available, created_at DESC, id DESC)` and supports a future
active-products count metric when it is added to the summary.

No new indexes are required for the currently implemented dashboard queries.

---

## 8. Test Requirements

### 8.1 `GET /api/dashboard/summary`

| Case | Expected |
|------|----------|
| Happy path: authenticated owner with leads, sessions, and clicks | 200; `data` matches the counts in the DB |
| Zero state: authenticated owner with a new business, no data | 200; `{ totalLeads: 0, newLeads: 0, totalChatSessions: 0, whatsappClicks: 0 }` |
| Ownership isolation: counts from business A are not visible to owner of business B | 200; business B sees only its own counts |
| Unauthenticated: no `Authorization` header | 401 |
| No business profile: user exists but has no `business_profiles` row | 404 with `code: 'BUSINESS_PROFILE_NOT_FOUND'` |

### 8.2 `GET /api/dashboard/recent-leads`

| Case | Expected |
|------|----------|
| Happy path: `limit=3`, business has 5 leads | 200; `data` length is 3; ordered newest first |
| Zero state: no leads yet | 200; `data: []` |
| Ownership isolation: leads from business A not in business B response | 200; business B's `data` contains only its own leads |
| `limit=21` (over max) | 422 |
| `limit=0` (under min) | 422 |
| `limit=abc` (non-integer) | 422 |
| Unauthenticated | 401 |

### 8.3 `GET /api/dashboard/recent-conversations`

| Case | Expected |
|------|----------|
| Happy path: sessions with customer messages exist | 200; `lastMessage` is the most recent customer message text |
| Session exists but has no customer messages | 200; `lastMessage: ""`, `lastMessageAt` is the session's `createdAt` |
| Zero state: no sessions | 200; `data: []` |
| Ownership isolation | 200; sessions from other businesses are excluded |
| Unauthenticated | 401 |

### 8.4 `GET /api/dashboard/top-questions`

| Case | Expected |
|------|----------|
| Happy path: multiple sessions with repeated customer messages | 200; results ordered by `count DESC` |
| Zero state: no chat messages | 200; `data: []` |
| Ownership isolation: messages from other businesses not counted | 200; only the authenticated business's messages |
| Unauthenticated | 401 |

### 8.5 `GET /api/dashboard/conversations/:sessionId/messages`

| Case | Expected |
|------|----------|
| Happy path: valid session owned by the authenticated user | 200; paginated messages, `meta` block present |
| Pagination: `page=2&limit=5` for a session with 7 messages | 200; `data` length 2, `meta.page: 2` |
| Session belongs to a different business | 404 with `code: 'CONVERSATION_NOT_FOUND'` |
| Session UUID does not exist | 404 with `code: 'CONVERSATION_NOT_FOUND'` |
| `page=0` | 422 |
| `limit=101` | 422 |
| Unauthenticated | 401 |

---

## 9. Acceptance Criteria

Feature is complete only when ALL items below pass.

- [ ] `GET /api/dashboard/summary` returns 200 with `{ totalLeads, newLeads, totalChatSessions, whatsappClicks }` for an authenticated owner.
- [ ] All four summary counts are `0` for a freshly registered owner with no data.
- [ ] Summary counts reflect only the authenticated owner's `business_profile_id`; a second owner's data does not appear.
- [ ] `GET /api/dashboard/recent-leads` returns at most 20 items; defaults to 5; ordering is `created_at DESC`.
- [ ] `GET /api/dashboard/recent-leads` returns `data: []` when the business has no leads.
- [ ] `GET /api/dashboard/recent-conversations` returns `lastMessage: ""` for a session that has no customer messages yet.
- [ ] `GET /api/dashboard/top-questions` returns items ordered by frequency descending; only `role = 'customer'` messages are counted.
- [ ] `GET /api/dashboard/conversations/:sessionId/messages` returns 404 for a session UUID that belongs to a different owner, even if that UUID is valid.
- [ ] `GET /api/dashboard/conversations/:sessionId/messages` response includes `meta.page`, `meta.limit`, `meta.total`, `meta.totalPages`.
- [ ] No response body ever contains `businessProfileId`, `userId`, `accessTokenHash`, or `isDemo`.
- [ ] Any request without a valid `Authorization: Bearer <token>` header returns 401 across all five endpoints.
- [ ] `limit=21` on widget endpoints returns 422, not silently clamped.
- [ ] All DB queries run via `COUNT(*)` aggregates or bounded `LIMIT` selects — no full-table loads into memory for counting.
- [ ] The `getRecentConversations` N+1 query is documented as a known issue and flagged for refactoring when the limit exceeds 5.
- [ ] Integration tests cover: happy path, zero state, ownership isolation, and unauthenticated request for each endpoint.
