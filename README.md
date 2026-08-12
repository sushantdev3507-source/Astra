# Astra — Sprint 4 + Gemini AI Edit Integration

Astra is the web-based asset editing tool for **Sonal.ai**. Sprint 1 built the
full-stack foundation. Sprint 2 added a real HTML5 Canvas editing engine.
Sprint 3 added AI Edit (mock provider), session recovery, and layers.
Sprint 4 added a Replicate/FLUX.1 Fill provider adapter, an async job
architecture (Celery + Redis), and a modernized UI. Sprint 5 added a
multi-page document foundation. **The most recent round integrates Google
Gemini (gemini-3.1-flash-image) as a real AI Edit provider, and makes mask
painting fully optional — a user can now type a natural-language
instruction like "remove the man behind the two people" with no painted
region at all.**

See `GEMINI_INTEGRATION.md` for the full report on that integration
(API contract, request/response flow, error handling, known limitations —
including that live Gemini inference is not yet verified, no credentials
are available in this environment).

See `SPRINT4_REPORT.md` for the full Sprint 4 report (provider setup, job
architecture, exact run commands, known limitations, Sprint 5
recommendations). Earlier sprint reports: `SPRINT3_REPORT.md`,
`SPRINT3_BUGFIX_REPORT.md`, `SPRINT2_REPORT.md`. This README covers what's
here and how to run it.

---

## What works right now

**Core editor (all backed by a real HTML5 Canvas engine, not placeholders):**
- Upload PNG/JPEG/WEBP → displays in the canvas
- Select, move, resize, rotate objects
- Draw (freehand brush, adjustable color/size)
- Eraser (non-destructive, spatially-local — erasing only removes the pixels
  actually touched, not whole strokes; see `SPRINT3_REPORT.md` §15)
- Text (create, edit, move, resize, rotate, font size, color, bold, italic;
  inline editing directly on the canvas)
- Shapes: rectangle, ellipse, line, triangle, arrow, star (fill, stroke,
  stroke width)
- Crop (drag to select, Apply/Cancel)
- Zoom in/out/reset (25%–400%, actually resizes the canvas, not CSS scaling)
- Undo/redo (one checkpoint per completed action — including AI Edit results)
- Keyboard shortcuts: Ctrl/Cmd+Z (undo), Ctrl/Cmd+Shift+Z (redo), Delete
  (delete selected object), Escape (deselect)
- Export as PNG or JPEG — exports the actual edited canvas (image + drawing
  layer + text + shapes + crop), not a page screenshot
- Save — persists the exported canvas to the backend as a proper
  `AstraEditResult`
- **AI Edit** — paint a mask, adjust brush size/feather radius, describe the
  edit, Generate. Backed by a deterministic mock AI provider (no external
  model/credentials); the result becomes a normal, undoable history entry.
- **Layers** — each text/shape object plus the draw/erase layer can be
  shown/hidden, locked, reordered, or deleted from the Layers panel
- **Session recovery** — edits autosave to IndexedDB; reopening the editor
  offers to restore your last session

**Sonal.ai integration readiness:**
- `/editor?assetId=<id>` or `/editor?assetUrl=<url>&assetType=image` — Astra
  can be launched with an external asset reference instead of a local upload
- `/dev/launch-astra` — a dev-only page that simulates "Sonal.ai launches
  Astra", for exercising that path without a real Sonal.ai integration
- `AstraLaunchContext` / `AstraEditResult` — typed contracts for the launch
  and save/return flows (see `frontend/lib/integration/`)
- `/api/v1/...` API versioning, with `/api/...` kept working for
  backward compatibility

**Not implemented (by design — see Sprint 3 scope):**
- A real AI model provider (mock only — see `SPRINT3_REPORT.md` for the
  provider abstraction that a real one plugs into)
- PDF / PPTX editing
- Authentication, user accounts, database, cloud storage
- Real-time collaboration
- A real Sonal.ai production API integration (only the local
  interfaces/contracts + mock dev flow exist, intentionally)

---

## Architecture

```text
Sonal.ai (future)
   │  launches with ?assetId=... or ?assetUrl=...
   ▼
Astra Frontend (Next.js, :3000)
   │
   ├── components/editor/     UI: Header, Toolbar, Canvas, PropertiesPanel, StatusBar
   ├── lib/editor/            React state: reducer, EditorProvider, EngineContext
   ├── lib/integration/       AstraLaunchContext, AstraEditResult, asset resolution
   ├── lib/canvas-engine/     thin re-export boundary into html-tool/
   │
   ▼ (imports, no REST for interactive editing)
html-tool/ (framework-agnostic Canvas engine)
   │  CanvasEngine: render, pointer interaction, EditorDocument
   │
   ▼ REST (upload / save / metadata only — never per-keystroke)
Astra Backend (FastAPI, :8000)
   │
   ▼
Local temporary file storage (backend/storage/{uploads,results})
```

Key design point: **undo/redo history lives in the React reducer** (from
Sprint 1), not inside the canvas engine. The engine just renders and calls
`onCommit(document)` once per completed action; the reducer owns the
history stack and calls `engine.restoreState(doc)` on undo/redo. See
`html-tool/README.md` for the engine's full interface.

---

## Requirements

- **Node.js** 20+ and npm 10+
- **Python** 3.11+

---

## Project structure

```text
astra/
├── html-tool/                 # Standalone HTML5 Canvas engine (no framework deps)
│   ├── src/engine.ts          # CanvasEngine class — the actual editor logic
│   ├── src/types.ts           # EditorDocument, EditorObject, etc.
│   └── README.md
│
├── frontend/                  # Next.js + TypeScript + Tailwind
│   ├── app/
│   │   ├── page.tsx            # Landing page
│   │   ├── editor/page.tsx     # /editor — reads launch query params
│   │   └── dev/launch-astra/   # Dev-only mock Sonal.ai launch page
│   ├── components/editor/      # Header, Toolbar, Canvas, PropertiesPanel, StatusBar
│   ├── lib/
│   │   ├── api/                 # client.ts, assets.ts, health.ts
│   │   ├── canvas-engine/       # re-export boundary into html-tool/
│   │   ├── editor/              # reducer.ts (undo/redo), EditorProvider, EngineContext
│   │   ├── integration/         # launchContext.ts, resolveAsset.ts, result.ts
│   │   └── types/asset.ts
│   └── public/branding/         # placeholder Astra logo
│
├── backend/                   # FastAPI + Pydantic
│   ├── app/
│   │   ├── main.py              # mounts /api/v1 (canonical) + /api (legacy alias)
│   │   ├── api/                  # health.py, assets.py
│   │   ├── services/asset_service.py  # upload, metadata lookup, result save
│   │   └── schemas/asset.py     # Asset, AstraEditResult, etc.
│   ├── tests/test_api.py        # 11 tests
│   └── requirements.txt
│
├── docs/
├── SPRINT2_REPORT.md
├── .env.example
└── .gitignore
```

---

## Running the backend

```bash
cd astra/backend
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt

# .env:
# ASTRA_ENV=development
# CORS_ORIGINS=http://localhost:3000

uvicorn app.main:app --reload --port 8000
```

Verify: `curl http://localhost:8000/api/v1/health` → `{"status":"ok",...}`.
Interactive docs at `http://localhost:8000/docs`.

## Running the frontend

```bash
cd astra/frontend
npm install

# .env.local:
# NEXT_PUBLIC_API_URL=http://localhost:8000

npm run dev
```

Open `http://localhost:3000` → **Open Astra Editor**, or go straight to
`http://localhost:3000/editor`.

To try the external-launch path: visit `http://localhost:3000/dev/launch-astra`,
pick a file, and it will "hand off" to `/editor?assetId=...` the way a real
host app launch would.

---

## API endpoints

| Method | Path (v1, canonical)              | Legacy alias (still works)   | Description |
|--------|------------------------------------|-------------------------------|-------------|
| GET    | `/api/v1/health`                    | `/api/health`                  | Health check |
| POST   | `/api/v1/assets/upload`             | `/api/assets/upload`           | Upload an image |
| GET    | `/api/v1/assets/{id}`               | `/api/assets/{id}`             | Asset metadata (powers external launch resolution) |
| GET    | `/api/v1/assets/{id}/file`          | `/api/assets/{id}/file`        | Fetch raw file (upload or saved result) |
| POST   | `/api/v1/assets/{id}/result`        | *(v1 only)*                    | Save an edited canvas as a result |
| POST   | `/api/v1/inpaint`                   | *(v1 only)*                    | **Sprint 4:** creates an AI Edit job — returns `202 {job_id, status}` |
| GET    | `/api/v1/jobs/{job_id}`             | *(v1 only — new in Sprint 4)*  | Poll an AI Edit job's status/result |
| GET    | `/api/v1/ai/status`                 | *(v1 only — new in Sprint 4)*  | Which AI provider is active (mock/real) and whether it's configured |

## Environment variables

See `.env.example`. All Sprint 4 variables are optional — the defaults keep
Sprint 3's mock/synchronous behavior with zero configuration:

- `AI_PROVIDER` — `mock` (default) or `real`. `real` requires
  `ASTRA_REPLICATE_API_TOKEN` to be set, or every AI Edit request fails with
  a clear config error (it never silently uses the mock).
- `ASTRA_REPLICATE_API_TOKEN` — Replicate API token, only needed for `real`.
- `ASTRA_REPLICATE_MODEL_VERSION` — defaults to FLUX.1 Fill.
- `ASTRA_USE_CELERY_JOBS` — `false` (default) runs AI jobs synchronously
  in-process (no Redis needed). Set `true` and run a Celery worker for real
  async processing — see `SPRINT4_REPORT.md` §23 for exact commands.
- `ASTRA_REDIS_URL` — defaults to `redis://localhost:6379/0`.

## Tests

**Backend:** `cd astra/backend && pytest tests/ -v` → 28/28 passing (runs in
the default synchronous-fallback mode — no Redis/worker required).

**Frontend:** `npx tsc --noEmit`, `npx eslint .`, and `npm run build` all
pass clean. See `SPRINT2_REPORT.md` for the full manual verification list
(upload → edit → export → save, external launch flow, etc.).
