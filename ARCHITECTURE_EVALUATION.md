# Astra — Editor Architecture Evaluation: Custom Canvas vs. Fabric.js

Prepared by Forge. Both codebases were directly inspected and, where relevant,
actually run — not evaluated from documentation or claims. Per the brief's
explicit instruction, no capability below is credited as "working" without
either reading the actual code path or observing it live.

---

## Phase 1 — Current Astra Implementation Audit

**Canvas engine** (`html-tool/src/engine.ts`): a single framework-agnostic
`CanvasEngine` class, no third-party canvas library. Owns rendering, pointer
interaction, and a serializable `EditorDocument`.

**Editor state**: `EditorDocument` — `sourceWidth/Height`, `zoom`, `crop`,
`drawingLayer` (raster), `objects[]` (vector text/shapes), `selectedObjectId`,
`baseImageOverride` (set by AI Edit results). Undo/redo history is owned by
the React reducer (`frontend/lib/editor/reducer.ts`), NOT the engine — the
engine reports completed actions via `onCommit`; the reducer keeps the stack.

**Layers**: `doc.objects[]` order IS z-order. Each object and the drawing
layer carry `visible`/`locked` flags. Reorder/hide/lock/delete are real
engine methods (`moveObjectUp/Down`, `setObjectVisibility`, etc.), not UI-only.

**Drawing/erasing**: both operate via `globalCompositeOperation` on one
shared raster canvas — `"source-over"` for draw, `"destination-out"` for
erase. This is genuinely correct, spec-level Canvas 2D behavior: erasing is
pixel-local by construction, cannot delete unrelated content, and cannot
"paint over" anything (verified against the exact `destination-out` line —
`engine.ts:1023`).

**Text/shapes**: vector objects, independently movable/resizable/rotatable.
Six shape types (rect, ellipse, line, triangle, arrow, star).

**Selection/transformation**: axis-aligned hit-testing plus rotation-aware
local-coordinate handles; move/resize/rotate via direct pointer-drag math in
the engine, not a library.

**Undo/redo**: one `commit()` per *completed* action (pointer-up), never
per-pointermove. Verified: `Canvas.tsx` now distinguishes a self-originated
commit from a genuine external undo/redo via `selfCommitPendingRef`
(`Canvas.tsx:23,34`) — this was a real, previously-shipped bug (redundant
`restoreState()` calls racing with in-flight strokes, causing the "eraser
wipes everything" regression) that is now fixed and covered by 10 passing
pure-logic regression tests (`historySync.test.ts`).

**AI masks**: a second raster canvas (`aiMaskCanvas`), separate from the
drawing layer, painted with a soft translucent color for on-screen feedback.
`exportAiMaskBlob()` binarizes it (`binarizeMaskCanvas`, alpha>threshold →
opaque white, else opaque black) into the strict WHITE=edit/BLACK=preserve
convention the backend expects — verified at `engine.ts:445,1165`.

**AI Edit request path**: `useAiEdit.ts` exports base image + mask blobs →
`POST /api/v1/inpaint` → FastAPI validates synchronously → `202 {job_id}` →
Celery task (or synchronous dev-mode fallback if Redis isn't configured) →
`InpaintingProvider.inpaint()` → result stored → frontend polls
`GET /api/v1/jobs/{id}`.

**AI result rendering / multi-edit chaining**: `applyAiResult()` sets
`doc.baseImageOverride` and calls the SAME `commit()` used by every other
edit — verified at `engine.ts:462-468`. This means a second, third, fourth AI
edit each starts from whatever `baseImageOverride` currently is (the
previous result), not the original upload — chaining works by construction,
not by special-casing. A generation-id guard (`useAiEdit.ts:55,79-81`)
discards any out-of-order network response from a superseded call.

**IndexedDB persistence**: `sessionStore.ts` — full `EditorDocument` plus,
as of the Sprint 4 hardening pass, `activeAiJobId`/`activeAiPrompt`, set the
instant a job is created and cleared the instant it reaches a terminal state
— verified at `sessionStore.ts:105-115`. A refresh mid-generation triggers a
ONE-SHOT status check on restore, never a duplicate submission.

**5onam.ai integration**: `?assetId=`/`?assetUrl=` query params, resolved
against `GET /api/v1/assets/{id}` — no localStorage dependency.
**Naming note**: the existing code and prior reports call this integration
"5onam.ai" throughout (`AstraLaunchContext`, comments, READMEs) — this is
the same "5onam.ai" the team clarified separately; it is a pending
find-and-replace cleanup, not a functional issue, and is called out here so
it doesn't get lost.

**Contracts that must not change**: `/api/v1/assets/*`, `/api/v1/inpaint`
(job-based), `/api/v1/jobs/{id}`, `/api/v1/ai/status`, the
`InpaintingProvider` interface, the `EditorDocument` shape (IndexedDB
sessions depend on it), the `?assetId=`/`?assetUrl=` launch contract.

---

## Phase 2 — Fabric.js Prototype Audit

Verified by running the app in a real headless browser (Chromium/Playwright)
in addition to reading the code — several findings below only surfaced by
actually clicking through it.

**Confirmed genuinely implemented** (real Fabric API usage, not just a UI
button):
- Image load/manipulate, free drawing (`brush.js`, real `fabric.PencilBrush`)
- Text, shapes (including a `fabric.Group` for compound arrow construction)
- Selection/drag/resize/rotate/scale — native Fabric object controls
- Layer ordering, lock/unlock (`lockMovementX/Y`, `selectable`), visibility
  toggle — all real property manipulation in `layers.js`
- Opacity — real, referenced in 5+ files
- Gradients, glow, shadow, filters — real, each its own ~300-450 line file
  applying actual `fabric.Image.filters.*` / gradient/shadow objects
- Clipping — real, via `image.clipPath` (used for their mask feature)
- Serialization — real and load-bearing: `canvas.toJSON()`/`loadFromJSON()`
  power THREE separate features (autosave, undo/redo history, and "save
  project" export) — Fabric provides this essentially for free, and it is a
  genuine architectural advantage over hand-rolling document serialization
- Zoom/pan — real (`zoomToPoint`, `setZoom`)
- Smart guides/snapping — present (`smart-guides.js`, 528 lines)
- Multi-page — a real, distinct concept (`pages.js`, 1304 lines): Add
  Page/Rename/Duplicate/Previous/Next, confirmed live in the running app.
  This has no equivalent in current Astra and is the one idea from this
  prototype worth taking seriously regardless of the engine decision.

**Present in the UI but NOT actually implemented** (verified live, not
assumed):
- **"Remove Background" and the AI prompt/Generate button**: both are
  `alert()` stubs. Confirmed zero `fetch()`/`XMLHttpRequest`/`axios` calls
  anywhere in the entire ~23,000-line codebase (grepped across all 33 JS
  files). "Auto Enhance," "Sharpen," "Grayscale," etc. are real — they're
  ordinary Fabric filters, not AI.
- **Undo/redo**: the code (`history.js`) is real and reasonably well-built
  (`toJSON` snapshot stack, capped at 50 steps) — but `history.js` is **never
  loaded by `photo-editor.html`**. As shipped, the running editor has no
  working undo/redo at all.
- **Copy/paste and keyboard shortcuts**: same issue — `keyboard.js` defines
  real `copyObject()`/`pasteObject()` functions, but is never loaded either.
  Their own context-menu's Copy/Paste items call these as
  `window.copyObject`/`window.pasteObject`, which don't exist in the running
  page — clicking them would error.
- **Authentication**: `sessionStorage`-only, no backend verification —
  cosmetic.
- **5onam.ai bridge** (`sonam-bridge.js`): reads
  `localStorage.getItem("sonamGeneratedImage")` — same-origin only, no
  backend asset resolution, and also never loaded by any page as shipped.

**Confirmed broken, live**:
- **Eraser is not an eraser.** `brush.js`'s eraser tool sets
  `canvas.freeDrawingBrush.color = "#ffffff"` and draws normal opaque white
  strokes — it paints over content, it does not reveal what's underneath.
  This only looks correct against a solid white background; on any other
  background or another layer, it visibly destroys content with a white
  smear instead of erasing it. This is a more fundamental problem than the
  timing bug found (and fixed) in Astra's own eraser — that was a real but
  fixable race condition; this is the wrong algorithm.
- `photo-editor.html` references three script files that don't exist
  (`frames.js`, `snap.js`, `clipboard.js` — actual files are named
  `frame.js`/`smart-guides.js`; no clipboard file exists at all) — confirmed
  404s in the browser console on page load.
- A live `"canvas is not defined"` JavaScript error reproduces during normal
  editor use.
- Every HTML page has literal markdown code fences pasted directly into the
  markup, rendering as stray visible text (confirmed in rendered
  screenshots, not just source).

---

## Phase 3 — Feature Comparison Matrix

| Capability | Current Astra Canvas | Fabric.js Prototype | Migration Difficulty |
|---|---|---|---|
| Drawing | Working (raster, destination-out) | Working (real `PencilBrush`) | Low |
| Eraser | Working (fixed; proven via regression tests) | **Broken** (paints white, doesn't erase) | Medium — must NOT port their approach |
| Text | Working (vector, inline editing) | Working | Low |
| Shapes | Working (6 types) | Working (more built-in shape variety) | Low |
| Selection | Working (custom hit-testing) | Working (native, more mature) | Low |
| Transformations | Working | Working (more polished, free) | Low |
| Layers | Working (visibility/lock/reorder/delete) | Working (same, real) | Medium |
| Undo/Redo | Working (fixed, regression-tested) | **Built but not wired into the running app** | Medium |
| Masking | Working (dedicated raster mask canvas, binarized export) | Working, via `clipPath` (different mechanism, would need adapting to our binary-mask contract) | High |
| AI Edit | Working end-to-end (mock; real provider adapter built, unverified) | **Not implemented** (stub alerts only) | High |
| IndexedDB | Working (full document + active-job recovery) | Present but `localStorage`-based, smaller size ceiling, not job-aware | High |
| Export | Working (PNG/JPEG, real composite) | Working (PNG/JPG/PDF — broader) | Low |
| Multi-page | **Not implemented** | Working (real, distinct feature) | New feature either way |
| PDF readiness | Not started, no blockers | Some groundwork (PDF export via jsPDF exists) | N/A — pre-decision |
| PPT/PPTX readiness | Not started, no blockers | Not started | N/A — pre-decision |

---

## Phase 4 — Is Fabric.js Appropriate as Astra's Editor Engine?

**Yes, technically feasible as an engine-layer swap.** Fabric.js does not
require replacing Next.js, FastAPI, the REST contracts, the AI provider
abstraction, Celery/Redis, or the 5onam.ai integration architecture — all of
that lives above/below the canvas layer and is engine-agnostic. The backend
in particular needs zero changes: it already just accepts `image + mask +
prompt` over HTTP and has never assumed anything about how those bytes were
produced.

**But the specific prototype evaluated is not migration-ready as-is.** Its
eraser is fundamentally wrong (not a bug to port, an approach to discard),
its undo/redo and copy/paste aren't active in the shipped app, it has no AI
integration of any kind, and its session persistence uses a storage
mechanism (`localStorage`) with a real size ceiling that our own job-recovery
work specifically avoided by using IndexedDB. None of these are
disqualifying for Fabric.js *the library* — they're specific to this
prototype's current state, and would need to be rebuilt properly regardless
of which engine wins.

---

## Phase 5 — AI Pipeline Compatibility

Verified compatible in principle, not yet proven in practice for Fabric:

- **Selecting a region + exporting a mask**: Fabric supports this via
  `clipPath` (as their `mask.js` already does) or by rendering shape objects
  to an offscreen canvas — either path can produce the binary black/white
  PNG our `/api/v1/inpaint` requires. Not implemented in the prototype today
  (no mask-export-to-PNG code exists — `mask.js`'s `clipPath` usage clips
  the *display*, it doesn't produce an exportable mask file).
- **Sending image+mask+prompt to FastAPI**: zero existing code — no
  `fetch()` calls exist anywhere in their codebase. This is 100% new work
  regardless of engine choice, since our current AI Edit networking
  (`useAiEdit.ts`, `inpaintClient.ts`) is written against our own Canvas
  engine's `exportBaseImageForAi()`/`exportAiMaskBlob()` methods, which
  don't exist in a Fabric world and would need Fabric-native equivalents.
- **Receiving and compositing the result, chaining multiple edits**: this is
  precisely what our `baseImageOverride` mechanism solves cleanly today by
  reusing the existing commit/undo pipeline. A Fabric implementation would
  need an equivalent — likely `canvas.setBackgroundImage()` plus a fresh
  `toJSON()` history snapshot — conceptually similar, not yet built.

**Conclusion: compatible, but 100% of the actual AI-Edit-on-Fabric code
would be new work.** None of it carries over from their prototype, since
none of it exists there yet.

---

## Phase 6 — 5onam.ai Integration

Their prototype's `localStorage`-based bridge is explicitly **not**
acceptable as the production mechanism, per the brief's own constraint, and
per the same reasoning our Sprint 2 integration work already established:
single-origin only, ~5-10MB ceiling, no backend-mediated asset resolution,
no auth-token path. Whatever engine wins, the production 5onam.ai
integration should remain our existing `assetId`/`assetUrl` +
backend-resolution contract — this is independent of the canvas engine
choice and requires no rework either way.

---

## Phase 7 — Decision

### Recommendation: **Option A — Keep the custom Canvas engine.**

**Reasoning:**

1. **The core risk this evaluation was meant to surface — "is our custom
   engine actually solid, or are we sitting on unfixed problems" — comes
   back clean.** Every specific problem area called out in the brief
   (eraser, multi-edit chaining, layer state, mask persistence, coordinate
   transforms) was verified against the actual current code, not assumed
   from passing tests, and each has a real fix in place with either
   regression tests or live-HTTP verification behind it.
2. **Fabric.js would remove real, working, already-integrated functionality**
   — the entire AI Edit pipeline, IndexedDB job recovery, and the
   5onam.ai integration contract — and require rebuilding all of it against
   a new engine, none of which exists in the evaluated prototype today. This
   is not "port their AI integration to our stack," because there is no AI
   integration to port.
3. **The prototype's one clearly superior piece of functionality (its
   eraser) is not — it's the most concretely broken thing in either
   codebase.** The rest of its advantages (opacity, gradients, shadows,
   filters, grouping, serialization-for-free) are real, but they're
   Fabric.js's baseline feature set, not something specific to this
   prototype that would be lost by not adopting it — if Fabric.js is ever
   adopted later, that baseline is still there to gain.
4. **The one idea worth taking regardless of engine**: the **multi-page
   concept**. This is a genuine gap in current Astra, directly relevant to
   the planned PDF/PPTX milestones, and doesn't require Fabric.js — it's a
   data-model and UI question (how does `EditorDocument` represent multiple
   pages) that fits naturally as an extension of our existing engine.

### If this is revisited later

Fabric.js remains a technically valid engine choice for a *future* decision
point — nothing here rules it out permanently. If revisited, treat it as
justified specifically by AI-Edit-on-Fabric and IndexedDB-job-recovery-on-Fabric
being built and proven first, in isolation, before any commitment to remove
the current engine — not by the broader feature list, most of which doesn't
require abandoning the current architecture to obtain.

---

## Functionality that must not regress (applies regardless of this decision)

- Eraser: partial, pixel-local erasure — proven via `historySync.test.ts`
- Undo/redo: one checkpoint per completed action, never per pointer-move
- AI Edit: mask paint/erase/clear, prompt independence between operations
  (verified via `test_sequential_different_prompts_are_independent` and
  `test_three_chained_edits_each_reflect_their_own_prompt`)
- Multiple AI edits chaining from the current (not original) image state
- IndexedDB session + active-job recovery without duplicate submission
- `/api/v1/*` contracts, `InpaintingProvider` interface
- 5onam.ai `assetId`/`assetUrl` launch contract (backend-resolved, not
  localStorage-based)

## Testing checklist (for any future engine work, Fabric or otherwise)

- [ ] Draw → erase middle of a stroke → both ends remain (not just "erase
      over drawing works" — the empty-area-click case specifically)
- [ ] AI Edit region A with prompt A → AI Edit region B with prompt B →
      confirm B does not resemble A's result
- [ ] Three chained AI edits without page refresh, each correct
- [ ] Undo through an AI result → original image restored; redo → result
      restored
- [ ] Refresh mid-AI-generation → job recovered once, not duplicated
- [ ] Export contains no UI overlay/mask-preview artifacts
- [ ] Live browser click-through (not yet done for either codebase as of
      this evaluation — remains the top open QA gap project-wide)
