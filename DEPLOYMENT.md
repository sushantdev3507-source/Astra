# Astra — Deployment Guide

How Astra's frontend (Next.js) and backend (FastAPI) find each other,
and how to actually deploy them separately.

## The short version

```
Local:        Next.js  --http-->  http://localhost:8000  --> FastAPI
Production:   Next.js  --HTTPS--> https://<your-backend>  --> FastAPI
```

Exactly ONE setting controls this: `NEXT_PUBLIC_API_URL`, set at
**frontend build time**. Nothing else needs to change.

## Why this matters: the actual problem being solved

`http://localhost:8000` only means anything on the machine that's
literally running both the frontend and backend at once (your own
laptop, in local dev). The moment the frontend is deployed anywhere
else -- GitHub Pages, Vercel, any static host -- `localhost:8000` on
someone else's browser means *their own computer*, not Astra's
backend. This has always been a build-time-configurable value, not a
hard-coded one -- see "What was already correct" below.

## Local development

```
frontend/.env.local:
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Then, as before: `uvicorn app.main:app --reload --port 8000` in one
terminal, `npm run dev` in another.

## Production deployment

1. Deploy the FastAPI backend somewhere that can run a persistent
   Python server (see "GitHub Pages" section below for why this can't
   be GitHub Pages itself) -- Render, Railway, Fly.io, a plain VM, etc.
   Note its public HTTPS URL.
2. Set `NEXT_PUBLIC_API_URL=https://<that-url>` in the frontend's
   hosting platform BEFORE building:
   - **Vercel**: Project Settings -> Environment Variables. Vercel
     rebuilds automatically when this changes.
   - **Any CI-based static build (e.g. a GitHub Action)**: set it as
     a build-step environment variable, e.g.
     `NEXT_PUBLIC_API_URL=https://... npm run build`.
3. On the backend, set `CORS_ORIGINS` to the frontend's real deployed
   URL (comma-separated if there's more than one, e.g. a preview URL
   plus a production URL): `CORS_ORIGINS=https://your-astra.vercel.app`.

**Important operational detail, verified directly (not assumed):**
`NEXT_PUBLIC_*` variables are baked into the compiled JavaScript AT
BUILD TIME, not read at runtime. Changing this value on a platform
AFTER a build has already happened does nothing until the next
rebuild. This was confirmed directly: building with
`NEXT_PUBLIC_API_URL=https://test-prod-backend.example.com` produced
compiled output with that exact string embedded in it.

## GitHub Pages / static export

**Not currently compatible, and this is a real architectural
constraint, not a configuration gap that more env vars would fix.**

Astra's `/editor` route (`frontend/app/editor/page.tsx`) is an async
Server Component that reads the incoming request's `searchParams`
server-side -- this is what makes the 5onam.ai asset-handoff
(`?assetId=...&assetUrl=...`) work: the backend asset is resolved
before the page even renders. Confirmed directly in `next build`
output: `/editor` is listed as `ƒ (Dynamic)` (server-rendered on
demand) in every build performed throughout this project, never
`○ (Static)`.

Reading a live request's query parameters is fundamentally a
server-side capability -- it requires something running that can see
each incoming request. GitHub Pages serves fixed files with no server
runtime at all, so this specific capability cannot work there no
matter how the rest of the app is configured. `output: "export"` was
deliberately NOT added to `next.config.ts` -- forcing it would either
break at build time or silently drop the 5onam.ai launch handoff,
neither of which is acceptable.

The other three routes (`/`, `/auth`, `/workspace`) ARE static
(`○ Static` in every build) and would export fine on their own -- the
constraint is specifically `/editor`.

**Recommended hosting**: Vercel (built by the same team as Next.js,
handles this dynamic-route case natively with zero extra
configuration) or any other platform that runs an actual Next.js
server/serverless functions, not a pure static host.

## Authentication headers -- forward compatibility

The API client (`lib/api/client.ts`) already passes through arbitrary
headers via its `RequestOptions`/`RequestInit` plumbing -- see how
`getMe()` (`lib/api/auth.ts`) already adds an `Authorization: Bearer`
header today for Astra's own auth. Nothing about this configuration
work blocks adding 5onam.ai-issued tokens the same way once that
handoff mechanism is confirmed with their team -- no new protocol was
invented here, and none was needed.

## Verified locally (this round)

- Searched the entire frontend for hard-coded `localhost` references
  -- found exactly two, both already correct and justified (the
  local-dev fallback in `getApiBaseUrl()`, and a dev-only mock launch
  page's URL-parsing base that never makes a network request).
- Built the frontend with a DIFFERENT `NEXT_PUBLIC_API_URL` and
  confirmed the new value actually appears in the compiled output.
- Ran the full backend test suite (95/95 passing, unaffected --
  no backend logic needed to change).
- Ran the frontend in PRODUCTION mode (`next start`, using the actual
  production build, not `next dev`) against the real backend and
  confirmed every `/api/v1/...` call -- health, asset upload, asset
  retrieval, AI Edit job submission, job polling, edited-result
  retrieval -- correctly resolved to the configured backend URL, with
  zero console errors.
