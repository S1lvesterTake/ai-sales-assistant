# Railway Deployment Guide

This guide walks through deploying the AI Sales Assistant for UMKM on [Railway](https://railway.app). The app runs as three independent services: PostgreSQL (managed plugin), NestJS backend, and Next.js frontend.

---

## Prerequisites

- A Railway account (free tier works for demo use)
- This repository pushed to GitHub (public or private)
- `openssl` available locally to generate a JWT secret

---

## Architecture Overview

```
Railway Project
├── PostgreSQL   (Railway managed plugin)
├── backend      (NestJS — ./backend/Dockerfile)
└── frontend     (Next.js — ./frontend/Dockerfile)
```

**Internal private networking (Railway resolves automatically):**
| Route | Connection |
|---|---|
| Frontend SSR → Backend | `http://backend.railway.internal:3001` |
| Backend → PostgreSQL | injected via `${{Postgres.DATABASE_URL}}` |

---

## Step 1: Create the Railway Project

1. Go to [railway.app](https://railway.app) → **New Project**
2. Select **Deploy from GitHub repo** → authorize and select your repo
3. Railway will detect the repo — **do not auto-deploy yet**, cancel the initial deploy prompt if it appears

---

## Step 2: Add PostgreSQL Plugin

1. In your Railway project dashboard → **+ New** → **Database** → **PostgreSQL**
2. Railway provisions a managed Postgres 16 instance and exposes `DATABASE_URL` as a reference variable
3. No further configuration needed

---

## Step 3: Configure the Backend Service

### Service setup

1. **+ New** → **GitHub Repo** → select the repo → set **Root Directory** to `/backend`
2. Railway auto-detects `backend/railway.toml` and `backend/Dockerfile`
3. Do **not** deploy yet — set env vars first

### Generate JWT secret

```bash
openssl rand -hex 32
```

Copy the output — you will paste it as `JWT_SECRET` below.

### Backend environment variables

In the Railway service → **Variables** tab, add all of the following:

| Variable | Value |
|---|---|
| `NODE_ENV` | `production` |
| `PORT` | `3001` |
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` |
| `FRONTEND_URL` | `https://${{frontend.RAILWAY_PUBLIC_DOMAIN}}` |
| `JWT_SECRET` | *(paste your generated secret)* |
| `JWT_EXPIRES_IN` | `3600` |
| `AI_PROVIDER` | `fake` |
| `OPENAI_API_KEY` | *(leave blank)* |
| `OPENAI_MODEL` | `gpt-4o-mini` |
| `AI_TIMEOUT_MS` | `8000` |
| `CHAT_SESSION_TTL` | `86400` |
| `CHAT_STALE_CLAIM_MS` | `30000` |
| `CHAT_SESSION_CREATE_LIMIT` | `10` |
| `CHAT_MESSAGE_LIMIT` | `20` |
| `DEMO_USER_PASSWORD` | *(choose a password — local dev default: see `.env.example`)* |
| `DEMO_DATA_RESET_ON_DEPLOY` | `true` |
| `DATABASE_POOL_MAX` | `10` |
| `DATABASE_CONNECTION_TIMEOUT_MS` | `5000` |
| `DATABASE_IDLE_TIMEOUT_MS` | `30000` |
| `RATE_LIMIT_LIMIT` | `100` |
| `RATE_LIMIT_TTL_MS` | `60000` |

> **Note on `FRONTEND_URL`:** This is a Railway reference variable. Railway resolves it at runtime to the frontend service's public domain. It controls the CORS `origin` header — the backend will only accept requests from the frontend's URL.
>
> **Warning:** The value must include the `https://` scheme. A bare domain without the prefix (e.g., `my-app.up.railway.app` instead of `https://my-app.up.railway.app`) causes `new URL()` to throw `Invalid URL` during startup validation, crashing the backend before it starts.

> **Note on `DEMO_DATA_RESET_ON_DEPLOY=true`:** The backend CMD runs the demo seed on every startup, resetting Kopi Senja demo data to a clean state on each deploy. This keeps the portfolio demo predictable.

### Deploy backend

Click **Deploy**. Wait for the healthcheck at `/api/health` to turn green (usually 30–60 s). You can follow logs in the Railway dashboard.

---

## Step 4: Configure the Frontend Service

### Service setup

1. **+ New** → **GitHub Repo** → select the repo → set **Root Directory** to `/frontend`
2. Railway auto-detects `frontend/railway.toml` and `frontend/Dockerfile`
3. Do **not** deploy yet — set env vars first

### Frontend environment variables

> **Critical:** `NEXT_PUBLIC_API_BASE_URL` is baked into the Next.js bundle at build time (it is a Docker `ARG`). It must be set in **both** the **Build Variables** tab and the **Variables** tab in Railway, or the deployed frontend will point to `localhost`.

In Railway → frontend service → **Variables** tab, add:

| Variable | Value | Notes |
|---|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | `https://${{backend.RAILWAY_PUBLIC_DOMAIN}}` | Build + runtime |
| `NEXT_PUBLIC_DEMO_BUSINESS_SLUG` | `kopi-senja-umkm` | Build + runtime |
| `NEXT_PUBLIC_API_MOCKING` | `disabled` | Build + runtime |
| `NEXT_PUBLIC_REPOSITORY_URL` | `https://github.com/S1lvesterTake/ai-sales-assistant` | Build + runtime |
| `API_BASE_URL` | `http://backend.railway.internal:3001` | Runtime only — SSR calls use private network |
| `NODE_ENV` | `production` | |
| `PORT` | `3000` | |

Then go to the **Build Variables** tab and add the same four `NEXT_PUBLIC_*` variables again with the same values.

### Deploy frontend

Click **Deploy**. Railway will resolve `${{backend.RAILWAY_PUBLIC_DOMAIN}}` to the backend's public URL before the Docker build starts, so the Next.js bundle gets the correct API base URL baked in.

---

## Step 5: Verify the Deployment

Once both services show green in the Railway dashboard:

### 1. Backend health check
```bash
curl https://<your-backend-domain>.up.railway.app/api/health
```
Expected response:
```json
{"success":true,"message":"Service is healthy","data":{"status":"ok","database":"up","timestamp":"..."}}
```

### 2. Frontend landing page

Open `https://<your-frontend-domain>.up.railway.app` in a browser. The landing page should load.

### 3. Public chatbot

Navigate to `/chat/kopi-senja-umkm`. The chatbot should respond (fake AI replies instantly).

### 4. Owner dashboard login

Navigate to `/login` and sign in with the demo credentials:
- **Email:** `demo@kopi-senja.com`
- **Password:** `DemoKopiSenja2026!`

### 5. Swagger API docs (optional)

`https://<your-backend-domain>.up.railway.app/api/docs`

---

## Custom Domains (optional)

If you want stable URLs (e.g. for a portfolio README link), assign custom domains in the Railway dashboard:

1. Backend service → **Settings** → **Networking** → **Custom Domain**
2. Frontend service → **Settings** → **Networking** → **Custom Domain**
3. After setting a custom domain for the backend, update `NEXT_PUBLIC_API_BASE_URL` in the frontend service and redeploy the frontend so the bundle is rebuilt with the new URL.

> **CORS note:** After assigning a custom domain to the frontend, both the custom domain and the original Railway URL (`https://<service>.up.railway.app`) remain live — but `FRONTEND_URL` only allows one origin. Update `FRONTEND_URL` on the backend to include both, comma-separated:
> ```
> FRONTEND_URL=https://my-custom-domain.com,https://<original-frontend>.up.railway.app
> ```
> The backend's origin parser already supports comma-separated values. Omitting the Railway URL from the list will CORS-block it.

---

## Redeploying / Resetting Demo Data

Because `DEMO_DATA_RESET_ON_DEPLOY=true`, every backend restart reseeds the demo business and leads. To force a reset without a code change:

1. Railway dashboard → backend service → **Deployments** → **Redeploy** (re-runs the latest image)

To change demo credentials, update `DEMO_USER_PASSWORD` in the backend service variables and redeploy.

---

## Switching to Real OpenAI (optional)

To upgrade from the fake AI provider to real GPT responses:

1. Backend service → Variables → update:
   - `AI_PROVIDER` → `openai`
   - `OPENAI_API_KEY` → your key from [platform.openai.com](https://platform.openai.com)
2. Redeploy the backend. No frontend changes needed.
