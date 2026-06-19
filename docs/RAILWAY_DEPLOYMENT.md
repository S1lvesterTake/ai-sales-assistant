# Railway Deployment Guide

## Architecture on Railway

```
Railway Project
├── backend   (Docker — backend/Dockerfile)
├── frontend  (Docker — frontend/Dockerfile)
└── postgres  (Railway PostgreSQL plugin)
```

---

## One-Time Setup Checklist

### 1. Railway Project & GitHub Connection

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Link repo to existing project (run from repo root)
railway link
```

In Railway Dashboard:
- **Settings → GitHub** → connect repo
- **Settings → Deployments** → set "Deploy on push to `main`"
- Enable "Wait for CI to pass" if you want CI gate before deploy

---

### 2. PostgreSQL Plugin

In Railway Dashboard:
1. Click **"New"** → **"Database"** → **"Add PostgreSQL"**
2. Railway injects `DATABASE_URL` automatically into all services in the same project
3. Verify: `DATABASE_URL` appears in your backend service's **Variables** tab

---

### 3. Backend Service Variables

Set these in Railway → backend service → **Variables**:

```env
# Auth
JWT_SECRET=<generate: openssl rand -base64 32>
JWT_EXPIRES_IN=7d

# AI
OPENAI_API_KEY=sk-...

# App
NODE_ENV=production
PORT=3000

# Chat
CHAT_SESSION_TTL=86400

# DATABASE_URL is injected automatically by Railway PostgreSQL plugin
# Do NOT set it manually — Railway manages it
```

> ⚠️ Never commit `.env` files. Source of truth is Railway Variables UI.

---

### 4. Frontend Service Variables

```env
NEXT_PUBLIC_API_URL=https://<backend-railway-domain>/api
NODE_ENV=production
```

Get the backend domain from Railway → backend service → **Settings → Domains**.

---

### 5. Railway Service Configuration

For **each service** (backend and frontend), set in **Settings**:

| Setting | Backend | Frontend |
|---|---|---|
| **Root Directory** | `backend` | `frontend` |
| **Builder** | `Dockerfile` | `Dockerfile` |
| **Dockerfile Path** | `Dockerfile` | `Dockerfile` |
| **Build Command** | _(empty — uses Dockerfile)_ | _(empty — uses Dockerfile)_ |
| **Start Command** | _(empty — uses CMD in Dockerfile)_ | _(empty — uses CMD in Dockerfile)_ |
| **Health Check Path** | `/api/health` | `/` |
| **Health Check Timeout** | `300` | `300` |

> **Critical:** Dockerfile Path is relative to Root Directory. If Root Directory is `backend`, set Dockerfile Path to `Dockerfile` — NOT `backend/Dockerfile`. Using `/backend/Dockerfile` with an empty Root Directory sets the build context to the repo root, where `package.json` doesn't exist, causing `COPY package.json` to fail.

---

## Common Failure Modes & Fixes

### ❌ Build fails: "Cannot find module"

**Cause:** `npm ci` in Docker uses `package-lock.json`. If lockfile is stale or missing:
```bash
# Fix locally:
cd backend && npm install
git add package-lock.json
git commit -m "chore: regenerate lockfile"
git push
```

---

### ❌ Build fails: "node: /lib/x86_64-linux-gnu/libc.so.6: version `GLIBC_2.xx` not required"

**Cause:** Node 24 requires a newer base image.

Check `backend/Dockerfile` — base image must be:
```dockerfile
FROM node:24-alpine AS base
# NOT node:24-slim or node:24 (debian) unless explicitly tested
```

---

### ❌ Deploy succeeds but `/api/health` returns 502

**Cause (most common):** App is listening on wrong port.

Railway injects `PORT` env var. Your app **must** listen on `process.env.PORT`.

In NestJS `backend/src/main.ts`:
```typescript
const port = configService.get<number>('PORT') ?? 3000;
await app.listen(port, '0.0.0.0'); // 0.0.0.0 is required, not localhost
```

> ⚠️ `app.listen(3000)` defaults to `localhost` — Railway's load balancer can't reach it.

---

### ❌ Deploy succeeds but app crashes: "DATABASE_URL is not defined"

**Cause:** Railway PostgreSQL plugin not linked to service, OR service deployed before plugin was added.

Fix:
1. Railway Dashboard → PostgreSQL plugin → **Connect** → select your backend service
2. Redeploy backend (Railway → backend → **Deploy**)

Verify the variable is present:
```bash
railway variables --service backend | grep DATABASE_URL
```

---

### ❌ DB migration doesn't run on deploy

**Cause:** Migrations are not running automatically.

Fix — add migration step to `backend/Dockerfile` CMD or entrypoint:
```dockerfile
# In backend/Dockerfile, final stage CMD:
CMD ["sh", "-c", "npm run db:migrate && node dist/main.js"]
```

Or use a Railway **Deploy Command** override in Settings:
```
sh -c "npm run db:migrate && node dist/main.js"
```

> ✅ `db:migrate` in Drizzle Kit is idempotent — safe to run on every deploy.

---

### ❌ Build fails: "ENOSPC: no space left on device"

**Cause:** Railway free tier build cache limit.

Fix: In Railway → backend service → **Settings** → disable "Build Cache" temporarily, redeploy, then re-enable.

---

### ❌ Frontend can't reach backend: CORS error

**Cause:** Backend CORS config doesn't include Railway frontend domain.

In `backend/src/main.ts`:
```typescript
app.enableCors({
  origin: [
    process.env.FRONTEND_URL,         // Railway frontend domain
    'http://localhost:3000',           // local dev
  ].filter(Boolean),
  credentials: true,
});
```

Add `FRONTEND_URL=https://<frontend-railway-domain>` to backend Railway Variables.

---

### ❌ Health check fails: timeout after 300s

**Cause:** App startup takes too long (common when running migrations on cold start).

Fix: Increase health check timeout in Railway Settings to `600`. Also check that `/api/health` doesn't do expensive ops — it should only ping the DB.

Verify your health endpoint:
```typescript
// modules/health/health.controller.ts
@Get()
async check() {
  await this.database.db.execute(sql`SELECT 1`);
  return { status: 'ok', timestamp: new Date().toISOString() };
}
```

---

## Deployment Verification Script

Run this after every Railway deploy:

```bash
# Replace with your actual Railway backend domain
BACKEND_URL=https://<your-backend>.railway.app

# 1. Health check
curl -f "$BACKEND_URL/api/health" && echo "✅ Health OK"

# 2. Auth endpoint reachable (should return 401, not 502)
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BACKEND_URL/api/auth/me")
[ "$STATUS" = "401" ] && echo "✅ Auth endpoint OK (401 expected)" || echo "❌ Auth endpoint returned $STATUS"

# 3. Public chat endpoint reachable
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BACKEND_URL/api/chat/nonexistent-slug/session")
[ "$STATUS" = "404" ] && echo "✅ Chat endpoint OK (404 expected)" || echo "⚠️  Chat endpoint returned $STATUS"
```

---

## GitHub Actions → Railway Integration (Optional: Deploy Gate)

To trigger Railway deploy only after CI passes, add to `.github/workflows/ci.yml`:

```yaml
deploy:
  needs: [typecheck, test, security-audit, docker-build]
  runs-on: ubuntu-latest
  if: github.ref == 'refs/heads/main' && github.event_name == 'push'
  steps:
    - name: Trigger Railway Deploy
      run: |
        curl -X POST \
          -H "Authorization: Bearer ${{ secrets.RAILWAY_TOKEN }}" \
          -H "Content-Type: application/json" \
          https://backboard.railway.app/graphql/v2 \
          -d '{"query":"mutation { deploymentTrigger(input: { serviceId: \"${{ secrets.RAILWAY_SERVICE_ID }}\" }) { id } }"}'
```

Add to GitHub repo secrets:
- `RAILWAY_TOKEN` — from Railway Dashboard → Account → API Tokens
- `RAILWAY_SERVICE_ID` — from Railway → backend service → Settings → Service ID

---

## Rollback Procedure

```bash
# Via CLI — list recent deployments
railway deployments --service backend

# Rollback to specific deployment
railway rollback <deployment-id> --service backend
```

Or via Dashboard: Railway → backend → **Deployments** → click any past deployment → **Rollback**.

---

## Environment Parity Checklist

Before pushing to `main`, verify:

- [ ] `backend/.env.example` reflects all required vars
- [ ] All new `ConfigService.getOrThrow()` calls have matching Railway Variables set
- [ ] No `process.env.X` direct access added in this PR (enforced by Husky hook)
- [ ] `npm run db:generate` was run if schema changed — migration file committed
- [ ] `npm run build` passes locally before push