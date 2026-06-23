# Skill: Drizzle ORM Migration

## Trigger
Use this skill when asked to add or change database schema, create a migration, or modify existing tables.

**Trigger phrases:** "tambah kolom", "buat tabel baru", "ubah schema", "generate migration", "add column to", "create table", "modify schema"

---

## Pre-Migration Checklist

Before touching any schema file, Claude must:

1. **Read `backend/src/database/schema/index.ts`** in full — understand all existing tables and relationships
2. **Read the relevant PRD section** in `docs/PRD_AI_Sales_Assistant_for_UMKM.md` — verify the schema change matches the product spec
3. **Check existing migrations** in `backend/src/database/migrations/` — understand what's already been applied
4. **Identify impact** — which repositories, services, and DTOs will be affected by this change?

---

## Hard Rules (from AGENTS.md)

- ❌ **NEVER** edit an existing `.sql` migration file — they are immutable once generated
- ❌ **NEVER** use `npm run db:push` outside local development
- ✅ **ALWAYS** generate new migrations with `npm run db:generate`
- ✅ **ALWAYS** commit migration files alongside the schema change in the same commit

---

## Schema Definition Patterns

### Table definition
```typescript
// In: backend/src/database/schema/index.ts

export const features = pgTable('features', {
  id: uuid('id').defaultRandom().primaryKey(),
  businessProfileId: uuid('business_profile_id')
    .notNull()
    .references(() => businessProfiles.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 100 }).notNull(),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
},
(table) => ({
  // Always add composite index for scoped queries
  businessProfileIdx: index('features_business_profile_idx').on(table.businessProfileId),
  // Add unique constraint where business rules require it
  uniqueNamePerBusiness: unique('features_name_business_unique').on(
    table.businessProfileId,
    table.name,
  ),
}));
```

### Adding a column to existing table
```typescript
// Add the column in schema/index.ts:
newColumn: varchar('new_column', { length: 255 }),  // nullable = no .notNull() for safe migration

// Then generate migration:
// npm run db:generate

// If backfill is needed, add a separate data migration after the schema migration
```

### Adding an index
```typescript
// Add inside the table's index factory:
newIdx: index('table_column_idx').on(table.columnName),
```

### Enum type
```typescript
export const featureStatusEnum = pgEnum('feature_status', ['active', 'inactive', 'pending']);

export const features = pgTable('features', {
  // ...
  status: featureStatusEnum('status').notNull().default('active'),
});
```

---

## Query Pitfalls

### Subquery column name collision (Drizzle footgun)

**Symptom:** `Failed query` at runtime — an ambiguous or duplicate column reference in the outer SELECT, even though TypeScript aliases are distinct.

**Cause:** Drizzle does not emit SQL-level `AS` aliases for schema column references inside a subquery. Both `chatSessions.createdAt` and `chatMessages.createdAt` map to the raw column name `"created_at"` in the generated SQL, so the outer query's `ORDER BY "ranked"."created_at"` becomes ambiguous and the query fails.

**Three rules apply to every `.select({})` that chains into `.as('name')`:**

1. **Alias every column from every table** — not only the "joined" table. A bare `sessionId: chatSessions.id` on the primary table is equally vulnerable to collision if `chatMessages.id` is ever added to the same select.
2. **Use `sql<T | null>` for LEFT JOIN columns** — `sql<Date>` erases Drizzle's nullability inference. Any column on the nullable side of a LEFT JOIN must be typed `sql<Date | null>`, otherwise the `??` fallback that protects against NULL at runtime is no longer type-enforced and can be safely removed by future refactors — incorrectly.
3. **Alias names must be unique across the whole inner SELECT** — not just per-table.

```typescript
// ❌ Both become "created_at" in SQL — outer query fails at runtime
const ranked = db.select({
  sessionCreatedAt: chatSessions.createdAt,
  lastMessageAt:    chatMessages.createdAt,
}).from(chatSessions).leftJoin(...).as('ranked');

// ✅ Explicit SQL aliases + correct nullability for the LEFT JOIN side
const ranked = db.select({
  sessionId:        sql<string>`${chatSessions.id}`.as('session_id'),
  sessionCreatedAt: sql<Date>`${chatSessions.createdAt}`.as('session_created_at'),
  lastMessage:      sql<string | null>`${chatMessages.message}`.as('last_message'),
  lastMessageAt:    sql<Date | null>`${chatMessages.createdAt}`.as('last_message_at'),
}).from(chatSessions).leftJoin(...).as('ranked');
//                    ^^^^^^^^^^^ LEFT JOIN → nullable → use sql<T | null>
```

**High-risk column names** (present in multiple tables — always alias these in subqueries):

| Column | Tables it appears in |
|---|---|
| `id` | every table |
| `created_at` | every table |
| `updated_at` | most tables |
| `business_profile_id` | sessions, leads, faqs, products, whatsapp |

**Prevention — SQL generation test pattern:**

Add the test inside the **existing** `*.spec.ts` for the same module (do not create a new file — AGENTS.md §5). Store the Pool separately so teardown can close it cleanly:

```typescript
// Inside dashboard.repository.spec.ts — new describe block
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from '../../database/schema';

describe('SQL generation', () => {
  const pool = new Pool();
  const db = drizzle(pool, { schema });

  afterAll(async () => { await pool.end(); });

  it('getRecentConversations subquery has no duplicate column names', () => {
    const builder = db.select({ /* mirror the production select */ })
      .from(schema.chatSessions)
      .leftJoin(/* same join condition as production */);

    const { sql: generatedSql } = builder.toSQL();

    // Assert absence of ALL duplicates — not just the known ones
    const colNames = generatedSql
      .slice(7, generatedSql.indexOf(' from '))
      .split(/,(?![^(]*\))/)
      .map((p) => {
        const m = p.match(/as "([^"]+)"/i) ?? p.match(/"([^"]+)"$/);
        return m?.[1] ?? p.trim();
      });
    const seen = new Set<string>();
    const dupes = colNames.filter((c) => seen.size === seen.add(c).size);
    expect(dupes).toEqual([]);
  });
});
```

Note: this test documents the SQL shape — it does **not** guard against regressions in the production method (which may change its query independently). Treat it as a schema-level contract, not a behaviour test.

---

## Migration Workflow

```bash
# Step 1: Edit schema/index.ts

# Step 2: Generate migration (from backend/)
npm run db:generate

# Step 3: Review the generated SQL in backend/src/database/migrations/
# Verify: correct table name, correct column types, no destructive changes
cat backend/src/database/migrations/<timestamp>_<name>.sql

# Step 4: Apply migration locally
npm run db:migrate

# Step 5: Verify the change
npm run db:studio  # Opens Drizzle Studio UI

# Step 6: Run tests to catch any broken queries
npm test

# Step 7: Commit BOTH files together
git add backend/src/database/schema/index.ts
git add backend/src/database/migrations/
git commit -m "feat(db): add features table with business profile scoping"
```

---

## Safe vs Unsafe Migrations

### ✅ Safe (non-breaking, can deploy without downtime)
- Adding a nullable column
- Adding an index
- Adding a new table
- Widening a varchar length

### ⚠️ Needs coordination (run migration before code deploy)
- Adding a NOT NULL column without a default → add default first, backfill, then add constraint
- Adding a unique constraint → ensure no duplicates exist first

### ❌ Destructive (discuss before proceeding)
- Dropping a column — ensure no code references it first
- Dropping a table
- Renaming a column — do as additive (add new + migrate data + drop old in separate PRs)
- Narrowing a varchar length

---

## Naming Conventions

| Object | Convention | Example |
|---|---|---|
| Table | `snake_case`, plural | `business_profiles` |
| Column | `snake_case` | `business_profile_id` |
| Index | `{table}_{column(s)}_idx` | `leads_business_profile_idx` |
| Unique constraint | `{table}_{column(s)}_unique` | `leads_phone_business_unique` |
| Enum type | `{name}_enum` (PG), `{name}Enum` (TS) | `pgEnum('lead_status', ...)` |
| Migration file | Auto-generated by Drizzle Kit — do not rename |

---

## After Schema Change: Update These Files

After every schema migration, check and update:

- [ ] **Repository** — update query types to reflect new columns
- [ ] **Response DTOs** — add new fields that should be public (exclude internal IDs)
- [ ] **Create/Update DTOs** — add fields that clients can set
- [ ] **`docs/CLAUDE.md`** — update "Database Tables" section if table count changes
- [ ] **`backend/.env.example`** — if migration introduced any new config-driven defaults

---

## Idempotency for Production

The Railway deploy command runs `npm run db:migrate` on every deploy. Drizzle Kit tracks applied migrations in `drizzle/__drizzle_migrations` table — safe to run repeatedly.

If a migration fails in production:
1. Check Railway logs for the exact SQL error
2. Fix the schema/migration issue locally
3. Generate a new corrective migration — **never edit the failed one**
4. Push and redeploy