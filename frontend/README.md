# AI Sales Assistant Frontend

Next.js App Router frontend for the AI Sales Assistant for UMKM portfolio
project.

## Requirements

- Node.js 20.9 or newer
- npm 11 or newer
- Docker for the production image verification

## Local Setup

```bash
cp .env.example .env.local
npm install
npm run dev
```

Open `http://localhost:3000`.

## Environment Variables

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | Public base URL of the NestJS API |
| `NEXT_PUBLIC_DEMO_BUSINESS_SLUG` | Public slug used by the demo flow |

These values are public and embedded in the browser bundle. Do not place
secrets or server credentials in `NEXT_PUBLIC_*` variables.

## Quality Commands

```bash
npm run lint
npm run typecheck
npm run test
npm run test:coverage
npm run test:e2e
npm run build
```

Install the Chromium test browser once before running Playwright:

```bash
npx playwright install chromium
```

## Docker

Build and run the standalone production image:

```bash
docker build -t ai-sales-assistant-frontend .
docker run --rm -p 3000:3000 ai-sales-assistant-frontend
```

Override public build-time variables when required:

```bash
docker build \
  --build-arg NEXT_PUBLIC_API_BASE_URL=https://api.example.com \
  --build-arg NEXT_PUBLIC_DEMO_BUSINESS_SLUG=kopi-senja-umkm \
  -t ai-sales-assistant-frontend .
```

## Architecture Notes

- Server Components are the default rendering model.
- Browser interaction is isolated in Client Components.
- Frontend code never calls an AI provider directly.
- JWT authentication will use an `HttpOnly` cookie in the authentication part.
- Public chat session tokens will use `sessionStorage`, never URLs or logs.
