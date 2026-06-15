# AI Sales Assistant Backend

Standalone NestJS API for the AI Sales Assistant for Indonesian UMKM.

## Requirements

- Node.js 24
- npm 11
- Docker 29 or newer for container verification

## Local Development

```bash
npm ci
cp .env.example .env
npm run start:dev
```

The API listens on `http://localhost:3001` by default. Health is available at
`GET /api/health`.

## Verification

```bash
npm run lint
npm run typecheck
npm test
npm run test:e2e
npm run build
```

## Container

```bash
docker build -t ai-sales-assistant-backend .
docker run --rm -p 3001:3001 ai-sales-assistant-backend
```
