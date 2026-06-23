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

**Rule:** In any `.select({})` that is part of a subquery (chains into `.as('name')`), every column selected from a **joined** table must be wrapped in an explicit sql alias:

```typescript
// ❌ Both become "created_at" in the generated SQL — outer query fails at runtime
const ranked = db.select({
  sessionCreatedAt: chatSessions.createdAt,
  lastMessageAt:    chatMessages.createdAt,
}).from(chatSessions).leftJoin(...).as('ranked');

// ✅ Force SQL-level AS aliases so each column is unambiguous
const ranked = db.select({
  sessionCreatedAt: sql<Date>`${chatSessions.createdAt}`.as('session_created_at'),
  lastMessageAt:    sql<Date>`${chatMessages.createdAt}`.as('last_message_at'),
}).from(chatSessions).leftJoin(...).as('ranked');
```

**High-risk column names** (present in multiple tables — always alias these in subqueries):

| Column | Tables it appears in |
|---|---|
| `id` | every table |
| `created_at` | every table |
| `updated_at` | most tables |
| `business_profile_id` | sessions, leads, faqs, products, whatsapp |

**Prevention:** Write a SQL generation test that calls `.toSQL()` on the inner builder (before `.as()`) and asserts the expected aliases are present. This runs in CI without a real database connection — see `backend/src/modules/dashboard/dashboard.repository.sql.spec.ts` as the reference.

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