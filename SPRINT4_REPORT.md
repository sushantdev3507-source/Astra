# Astra - Sprint 4 Report

## 1. Summary

Sprint 4 replaced the mock-only AI pipeline with a real provider adapter
(implemented, but NOT live-verified against an actual model -- no credentials
are available in this environment), moved AI generation from a blocking
synchronous call to a real async job architecture (Celery + Redis, with a
documented synchronous fallback for local dev), modernized the editor's UI
(glassmorphism shell, icon toolbar with real keyboard shortcuts, an AI
generation visualizer, a three-signal status indicator), and hardened session
recovery to track an in-flight AI job across a page refresh.

**Honesty check, per the sprint's explicit requirement:** real AI provider
credentials do not exist in this environment (verified by inspecting the
environment directly). The `RealGenerativeAIProvider` adapter is fully
implemented against Replicate's REST API contract, but **live inference
against an actual model has not been executed or verified.** What HAS been
verified live, with a real running Celery worker and real Redis: the entire
async job architecture, end-to-end, using the mock provider as the payload.
See sections 9 and 19 for exactly what was and wasn't tested.

## 2. Files created

```
backend/app/services/inpainting/real_provider.py   RealGenerativeAIProvider (Replicate/FLUX.1 Fill)
backend/app/services/inpaint_pipeline.py            Shared validate->feather->provider->store logic
backend/app/jobs/__init__.py
backend/app/jobs/celery_app.py                       Celery app config (Redis broker+backend)
backend/app/jobs/tasks.py                            The actual background task
backend/app/jobs/store.py                            Dual-mode job submission/status (Celery or sync fallback)
backend/app/jobs/schemas.py                           JobStatus, JobCreateResponse, JobStatusResponse
backend/app/api/jobs.py                               POST /inpaint (202+job_id), GET /jobs/{id}
backend/app/schemas/ai_status.py                       AiStatusResponse

frontend/lib/editor/AiEditContext.tsx                  Shared AI-edit state (Toolbar + Canvas both need it)
frontend/lib/hooks/useAiProviderStatus.ts               Polls /api/v1/ai/status
```

## 3. Files modified

```
backend/app/config.py                  AI_PROVIDER/ASTRA_REPLICATE_*/ASTRA_REDIS_URL/ASTRA_USE_CELERY_JOBS
backend/app/services/inpainting/factory.py   real provider support, no-silent-fallback guarantee
backend/app/api/inpaint.py             now only GET /ai/status + GET /jobs-mode (job endpoints moved to jobs.py)
backend/app/main.py                    mounts the new jobs router
backend/tests/test_inpaint.py          migrated to job-creation + polling pattern

frontend/lib/ai/inpaintClient.ts       job creation + polling + progress callback + one-shot status check
frontend/lib/hooks/useAiEdit.ts        expanded status vocabulary; persists/clears active job id
frontend/lib/hooks/useKeyboardShortcuts.ts   added V/B/E/T/S/C/M tool shortcuts
frontend/lib/persistence/sessionStore.ts     activeAiJobId/activeAiPrompt fields + set/clear helpers
frontend/components/editor/Toolbar.tsx        icons (lucide-react), tooltips, glassmorphism, new statuses
frontend/components/editor/Canvas.tsx         AI generation shimmer overlay
frontend/components/editor/Header.tsx         glassmorphism styling
frontend/components/editor/StatusBar.tsx      glassmorphism + resolution indicator
frontend/components/editor/BackendStatusIndicator.tsx   three distinct status signals
frontend/components/editor/SessionRecoveryPrompt.tsx    active-job detection/one-shot resolution on restore
frontend/components/editor/PropertiesPanel.tsx           glassmorphism palette
frontend/components/editor/LayersPanel.tsx                glassmorphism palette
frontend/components/editor/UploadDropzone.tsx             accent color update
frontend/components/editor/EditorShell.tsx                 wires AiEditProvider
frontend/app/globals.css                                    shimmer keyframe
backend/requirements.txt                celery, redis added
```

## 4. Real AI provider selected

**Replicate**, running **FLUX.1 Fill** (Black Forest Labs) by default, with
SDXL Inpaint or any other Replicate-hosted inpainting model swappable via one
config value (`ASTRA_REPLICATE_MODEL_VERSION`). Replicate was chosen over a
direct Stability AI or self-hosted integration because: it hosts both R&D
candidates behind one stable REST contract, requires no GPU infrastructure of
Astra's own, and accepts image/mask input as base64 data URIs directly, so no
separate public file hosting step is needed.

## 5. Provider configuration

```
AI_PROVIDER=real                                    # or "mock" (default)
ASTRA_REPLICATE_API_TOKEN=<your Replicate API token>
ASTRA_REPLICATE_MODEL_VERSION=black-forest-labs/flux-fill-dev   # optional, this is the default
```

If `AI_PROVIDER=real` is set without `ASTRA_REPLICATE_API_TOKEN`, every AI
Edit request fails immediately with a clear configuration error -- it never
silently uses the mock. `GET /api/v1/ai/status` reports the live state
(`provider`, `configured`, `model`) so the frontend can show this honestly
instead of assuming reachability equals capability.

## 6. Model/API used

Replicate's predictions API: `POST /v1/models/{owner}/{model}/predictions`
(create), `GET /v1/predictions/{id}` (poll until `succeeded`/`failed`), then
a plain `GET` to download the result image URL. See
`backend/app/services/inpainting/real_provider.py`.

## 7. AI request architecture

```
Canvas (mask paint) -> Toolbar (Generate) -> useAiEdit.ts
   -> POST /api/v1/inpaint (multipart: image, mask, prompt, feather_radius)
   -> FastAPI validates synchronously (prompt/feather_radius) -> 202 + job_id
   -> submit_job() -- Celery task OR synchronous fallback (app/jobs/store.py)
   -> app/services/inpaint_pipeline.py: validate image/mask -> feather -> provider.inpaint()
   -> result stored -> job status becomes "completed"
   -> frontend polls GET /api/v1/jobs/{id} (lib/ai/inpaintClient.ts)
   -> engine.applyAiResult(url) -- ONE undo/redo history checkpoint
```

The browser never talks to Replicate (or any provider) directly -- only to
Astra's own backend. No provider-specific code exists anywhere in the
frontend or in the Canvas engine.

## 8. Mask feathering implementation

Unchanged from Sprint 3 (`backend/app/services/mask_utils.py`):
`ImageFilter.GaussianBlur(radius=feather_radius)` applied to a copy of the
binary mask, never mutating the original. Still configurable per-request
(0-40px, default 6px), exposed as a slider in the AI Edit panel.

## 9. Celery architecture

`backend/app/jobs/celery_app.py` configures a single Celery app with Redis as
both broker and result backend. `backend/app/jobs/tasks.py` defines exactly
one task, `astra.run_inpaint`, which base64-decodes the image/mask (Celery's
JSON serializer can't carry raw bytes), runs the async pipeline via
`asyncio.run()`, and returns a structured success/failure dict.

**Verified live in this session**: installed Redis, started a real Celery
worker (`celery -A app.jobs.celery_app worker`), confirmed `astra.run_inpaint`
registered, submitted a job through the actual running FastAPI server, and
watched it flow: HTTP request -> Redis -> worker picks it up -> mock provider
runs -> result stored -> status endpoint reports `completed` with the correct
result reference. Worker log confirms: `Task astra.run_inpaint[...] succeeded
in 0.054s`.

## 10. Redis architecture

Redis used exactly as both Celery broker and result backend --
`ASTRA_REDIS_URL` (default `redis://localhost:6379/0`). No other use of
Redis in the system (no caching, no session storage there).

## 11. Job lifecycle

```
queued -> processing -> completed
                      -> failed
```

`queued`: job created, not yet picked up by a worker (or, in sync-fallback
mode, this state is skipped entirely since the work already ran before the
create call returned). `processing`: a worker has started the task.
`completed`/`failed`: terminal; `GET /jobs/{id}` returns the result or error
respectively. One known, documented limitation: Celery's `AsyncResult`
reports `PENDING` both for "genuinely queued" and for "this job_id was never
submitted at all" -- there's no reliable way to distinguish the two through
Celery's API alone. In Celery mode, `GET /jobs/{unknown-id}` therefore
returns `200 {"status":"queued"}` rather than `404` (this diverges from the
synchronous-fallback mode's behavior, which correctly 404s on truly unknown
ids -- see the test suite's `test_job_not_found_returns_404`, which runs
against sync-fallback mode by default).

## 12. Error handling

Every failure mode in the pipeline (invalid image, invalid mask, mismatched
dimensions, prompt validation, provider timeout/network error, provider
rejection) returns a job in `failed` status with a clean, user-safe `error`
message -- never a stack trace. On the frontend, `useAiEdit.ts` never clears
the mask or discards the prompt on failure; the user can just press Generate
again. A request-generation guard (added in the Sprint 3 bugfix round,
preserved here) discards any out-of-order response from a superseded call.

## 13. UI architecture changes

- **Design system**: `bg-slate-900/80 backdrop-blur-md border-slate-700/50`
  applied consistently across Header, Toolbar, StatusBar, PropertiesPanel;
  accent colors `#6366F1` (primary) and `#38BDF8` (secondary/real-AI
  indicator) used consistently rather than scattered indigo/sky shades.
- **Toolbar**: icon-first (`lucide-react`), each tool has a real, working
  keyboard shortcut (V/B/E/T/S/C/M -- see `useKeyboardShortcuts.ts`), shown
  in the tooltip. Shortcuts never fire while typing in a text field or
  before an asset is loaded.
- **AI generation visualizer**: an indeterminate animated shimmer sweep
  (`astra-ai-shimmer` keyframe in `globals.css`) over the canvas during
  generation, with a status pill showing the current stage
  (Preparing/Uploading/Queued/Generating/Finishing). No fake percentage
  anywhere.
- **Backend status indicator**: three independent signals -- backend
  reachability, mock-vs-real AI (with a distinct "not configured" state),
  and active job processing -- rather than one dot implying all three.

## 14. Dynamic inspector implementation

Unchanged from Sprint 3's already-contextual PropertiesPanel (text/shape
property editors, no-selection asset metadata view) -- restyled to match the
new palette, but no new field types (e.g. opacity) were added this sprint;
the underlying engine has no opacity concept yet, and inventing UI for a
control that doesn't do anything was deliberately avoided. See section 20.

## 15. Layer implementation status

Unchanged from Sprint 3 (`LayersPanel.tsx`, engine-side visibility/lock/
reorder methods) -- restyled only. AI results continue to be represented as
`doc.baseImageOverride` (a base-image swap, not a separate layer entry),
labeled "(AI edited)" in the Base Image row, consistent with how Sprint 3
documented this choice.

## 16. IndexedDB compatibility

Extended, not replaced. `PersistedSession` gained `activeAiJobId` and
`activeAiPrompt`. `useAiEdit.ts` calls `setActiveAiJob(jobId, prompt)` the
instant a job is created and `clearActiveAiJob()` the instant it reaches any
terminal state -- so a stale `activeAiJobId` in storage always means
"genuinely still unresolved as of the last save," never a leftover from a
completed run. `SessionRecoveryPrompt.tsx` checks that job's status **once**
on restore (never resubmits, never polls repeatedly): if it completed while
the user was away, the result is applied automatically; if it's still
queued/processing, the user is told rather than the app silently duplicating
a generation request; if failed or unknown, it's just cleared.

**Known limitation, stated plainly**: the mask pixels and prompt text
themselves are NOT currently persisted to IndexedDB (only the job id and
prompt string are, for the purpose above) -- a refresh mid-mask-painting
still loses the unpainted mask. Full mask persistence would require
serializing the mask canvas to IndexedDB on every stroke, which was judged
lower priority than the job-recovery behavior above given the time
available. See section 22.

## 17. Manual QA results

**Performed, live, in this session:**
- Started real Redis + a real Celery worker + FastAPI (with
  `ASTRA_USE_CELERY_JOBS=true`) + Next.js dev server together.
- Confirmed `GET /api/v1/jobs-mode` reports `{"async_mode": true}`.
- Uploaded a real image via `/api/v1/assets/upload`.
- Submitted a real AI job via `/api/v1/inpaint`, watched the Celery worker
  log show it received and completed the task, confirmed the job status
  endpoint correctly reported `completed` with a valid result reference,
  downloaded and verified the result image.
- Confirmed the editor page and the dev launch page both still render
  correctly (SSR) with the full new toolbar/icons present.
- **Caught and fixed a real bug before packaging**: an earlier live-test
  session had left `ASTRA_USE_CELERY_JOBS=true` in the committed `.env`
  file with no worker running, which caused every backend test to fail
  with timeouts. Reset to the safe default and re-verified all tests pass.

**NOT performed** (same caveat as every prior sprint report in this
project): interactive browser click-through -- actually dragging to paint a
mask, clicking Generate and watching the shimmer overlay, pressing keyboard
shortcuts, triggering session recovery by refreshing mid-generation. No
browser automation tool was available in this environment. Given this
sprint's explicit "manual browser QA is REQUIRED" instruction, this is
stated as an open gap, not glossed over -- see section 20.

## 18. Automated test results

**Backend**: 28/28 passing (in the default synchronous-fallback mode, which
is what ships and what the test suite is designed to run against
deterministically, without depending on a live worker process). Includes 3
new Sprint 4 tests (`test_inpaint_returns_202_with_job_id`,
`test_job_not_found_returns_404`, `test_ai_status_reports_mock_by_default`)
plus all Sprint 1-3 regression tests, migrated to the new job-polling
pattern where the API contract changed.

**Frontend**: `tsc --noEmit`, `eslint .`, and `next build` all clean.

## 19. AI generation latency

**Mock provider, via the real Celery/Redis pipeline**: 21-30ms task
execution time (measured in the worker log across this session's live
tests) -- consistent with Sprint 3's direct-call measurements, confirming
the async job wrapper itself adds negligible overhead for a fast provider.

**Real provider (Replicate/FLUX.1 Fill): not measured.** No credentials
were available to execute a real request in this environment. Real-model
latency should be measured before deciding whether the async architecture
(already built) is sufficient or whether additional scaling (multiple
workers, a dedicated queue) is warranted -- FLUX.1 Fill and SDXL Inpaint
typically run in the few-seconds-to-tens-of-seconds range on hosted GPU
infrastructure, meaningfully slower than the mock, which is precisely why
the async architecture was worth building now rather than after credentials
arrive.

## 20. Known limitations

- **Real AI has not been live-verified** (section 1, section 19) -- adapter
  implemented against Replicate's documented contract, untested against an
  actual model.
- **No live browser QA performed** (section 17) -- everything verified via
  direct HTTP calls, a real running worker, and static analysis, not actual
  mouse interaction.
- **Mask/prompt content is not persisted to IndexedDB**, only the job
  reference (section 16) -- a refresh mid-mask-painting (with no job yet
  submitted) still loses the unpainted mask.
- **Celery mode's job-not-found detection is imprecise** (section 11) -- an
  unknown job id and a genuinely-queued-but-not-yet-started job are
  indistinguishable through Celery's own API.
- **No opacity controls** were added to the inspector (section 14) since the
  underlying engine has no opacity concept yet -- would need engine work
  first, out of scope for a UI-only pass.
- **Responsive layout was not verified at the three specified breakpoints**
  (1280x720/1440x900/1920x1080) -- this requires an actual browser to check
  rendered layout, which wasn't available. The Tailwind classes used
  (shrink-0, overflow-y-auto, flex layouts) are the same responsive patterns
  already in place since Sprint 1-3, not newly introduced risk, but this is
  an assertion from code review, not a verified observation.
- **`ASTRA_INPAINT_PROVIDER` (Sprint 3 name) and `AI_PROVIDER` (Sprint 4
  name) both work**, with `AI_PROVIDER` taking priority when both are set --
  intentional backward compatibility, but two names for the same setting is
  worth consolidating in a future cleanup.

## 21. Security considerations

- `ASTRA_REPLICATE_API_TOKEN` is read only from the environment, never
  logged, never returned in any API response, never sent to the browser --
  the frontend has no code path that could see it.
- The prompt is still never logged (carried over from Sprint 3).
- Real-provider errors are caught and converted to generic, user-safe
  messages before reaching the client -- Replicate error details (which
  could contain internal identifiers) are not passed through verbatim.
- Celery task payloads (image/mask as base64) live in Redis only as
  transient task arguments/results, expiring per `job_result_ttl_seconds`
  (default 1 hour) -- not a long-term data store.
- No secrets were committed -- `.env` remains gitignored, confirmed clean
  before packaging (see section 17's caught-and-fixed note).

## 22. Environment variables required

New in Sprint 4 (all optional -- defaults keep the mock/sync-fallback
behavior with zero configuration):

```
AI_PROVIDER=mock                                  # or "real"
ASTRA_REPLICATE_API_TOKEN=                        # required only if AI_PROVIDER=real
ASTRA_REPLICATE_MODEL_VERSION=black-forest-labs/flux-fill-dev
ASTRA_USE_CELERY_JOBS=false                       # set true + run a worker for real async processing
ASTRA_REDIS_URL=redis://localhost:6379/0
```

## 23. Exact commands to run everything

```bash
# Redis (only needed if you want real async job processing --
# otherwise Astra runs jobs synchronously in-process automatically)
redis-server --daemonize yes --port 6379

# Backend
cd backend
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Celery worker (only if ASTRA_USE_CELERY_JOBS=true in backend/.env)
cd backend
celery -A app.jobs.celery_app worker --loglevel=info

# Frontend
cd frontend
npm install
npm run dev
```

Without Redis/a worker running, Astra works exactly as before (Sprint 3
behavior) -- AI jobs just run synchronously in-process rather than through a
real queue. This is the documented default, not a degraded fallback state
that needs explaining away.

## 24. Recommended Sprint 5 priorities

1. **Live browser QA** (section 17, section 20) -- now the single most
   repeated gap across Sprints 1-4 in this project; nothing further should
   be trusted as fully "done" until this happens.
2. **Obtain real AI credentials and verify live inference** (section 1,
   section 19) -- the adapter is ready; this is now purely a
   credentials/testing task.
3. **Persist mask pixels to IndexedDB**, not just the job reference
   (section 16), for full session-recovery fidelity.
4. **Consolidate `ASTRA_INPAINT_PROVIDER`/`AI_PROVIDER`** into one name
   (section 20).
5. **Add opacity to the engine** if the inspector's opacity controls are
   still wanted (section 14) -- needs engine-level work first.
6. **Re-measure AI latency against a real provider** (section 19) to decide
   whether the current single-worker Celery setup needs scaling.
