# Astra — Sprint 3 Report

## 1. Files created

```
backend/app/services/inpainting/__init__.py
backend/app/services/inpainting/base.py            InpaintingProvider abstract class
backend/app/services/inpainting/mock_provider.py    Deterministic mock provider
backend/app/services/inpainting/factory.py           Provider selection by env var
backend/app/services/mask_utils.py                   Mask validation + feathering
backend/app/schemas/inpaint.py                        InpaintResponse
backend/app/api/inpaint.py                            POST /inpaint
backend/tests/test_inpaint.py                         11 new tests

frontend/lib/ai/inpaintClient.ts                      Calls Astra's own /api/v1/inpaint
frontend/lib/hooks/useAiEdit.ts                        AI generation lifecycle (Idle/Preparing/Generating/Success/Error)
frontend/lib/persistence/sessionStore.ts               IndexedDB wrapper (save/load/clear)
frontend/lib/hooks/useSessionAutosave.ts                Debounced autosave hook
frontend/components/editor/SessionRecoveryPrompt.tsx    Restore/Discard UI
frontend/components/editor/LayersPanel.tsx              Layer stack UI

SPRINT3_REPORT.md (this file)
```

## 2. Files modified

```
backend/app/config.py                  - inpaint_provider, prompt/feather limits
backend/app/services/asset_service.py  - validate_image_bytes made public, store_result_bytes() added
backend/app/main.py                    - mounts the new inpaint router under /api/v1

html-tool/src/types.ts     - ToolId gains "ai-edit"; EditorDocument gains baseImageOverride;
                              objects + drawingLayer gain visible/locked (doc version bumped to 2)
html-tool/src/engine.ts    - AI mask subsystem, base-image-override undo/redo support,
                              layer visibility/lock/reorder methods

frontend/lib/editor/types.ts       - pendingRestoreDocument field; TOOLS includes ai-edit
frontend/lib/editor/reducer.ts     - asset/set accepts a restoreDocument; session/consumeRestore
frontend/components/editor/Canvas.tsx         - applies a pending restore document after image load
frontend/components/editor/Toolbar.tsx        - AI Edit panel (mask paint/erase/clear, brush size,
                                                  feather radius, prompt, Generate); contrast fix
frontend/components/editor/PropertiesPanel.tsx - mounts LayersPanel
frontend/components/editor/Header.tsx          - New Image now also clears the saved session
frontend/components/editor/EditorShell.tsx     - wires autosave + recovery prompt, guards recovery
                                                   against racing an external 5onam.ai launch
frontend/components/editor/StatusBar.tsx       - padding/clipping/z-index fixes
```

No files were deleted. Sprint 1 and Sprint 2's architecture (Next.js UI, FastAPI backend,
html-tool Canvas engine, REST transport, the existing undo/redo reducer) was extended,
never replaced or rewritten.

## 3. AI Edit architecture

End-to-end flow, exactly as specified:

```
User selects AI Edit tool
    -> paints a mask on the canvas (separate mask canvas, see 4)
    -> enters a prompt, adjusts feather radius
    -> clicks Generate
    -> frontend exports (base image blob, binary mask blob)
    -> POST /api/v1/inpaint (multipart: image, mask, prompt, feather_radius)
    -> backend validates everything, feathers the mask, calls the configured
       InpaintingProvider (mock by default)
    -> provider returns edited image bytes
    -> backend stores it as a new result asset, returns its URL
    -> frontend loads that URL and calls engine.applyAiResult(url)
    -> this becomes exactly ONE undo/redo history checkpoint (7)
```

`useAiEdit.ts` owns the network/lifecycle side entirely -- the engine itself has zero
networking code, matching html-tool's "framework/network agnostic" design rule from
Sprint 2. On failure, the mask canvas and the prompt text field are left completely
untouched (the mask lives in the engine, unaffected by a failed fetch; the prompt is a
plain React state string that's never cleared on error), so the user can just press
Generate again without repainting.

## 4. Mask architecture

A genuinely separate canvas (`aiMaskCanvas`) from the draw/erase layer -- this is the
"dual canvas" requirement. It uses the exact same source-space coordinate system as
everything else in the engine (all painting happens in `toSourceCoords()`-converted
coordinates), so it inherits correct alignment through zoom, pan, and crop automatically --
there's no separate transform logic for the mask to drift out of sync with.

Two representations exist simultaneously, deliberately:
- **On-screen preview**: soft, semi-transparent sky-blue strokes (`rgba(56,189,248,0.55)`),
  painted with normal `source-over`/`destination-out` compositing -- good visual feedback,
  brush cursor size is directly what you see.
- **Inference mask**: a strict binary black/white PNG, produced by `binarizeMaskCanvas()`
  at export time -- any pixel with alpha above a small threshold becomes fully opaque
  white, everything else becomes fully opaque black. This keeps the WHITE=edit /
  BLACK=preserve convention exact and explicit, regardless of how soft the on-screen
  brush strokes were, and keeps the *intentional* softening (feathering) entirely
  server-side and controllable (see 9).

The mask is intentionally **not** part of `EditorDocument` / undo history -- it's prep
state for the next Generate call, not a persisted edit. Only the eventual AI *result*
becomes a history checkpoint (7). It's cleared automatically after a successful
generation (via `applyAiResult()` calling `clearAiMask()`), since a mask is scoped to
one specific edit.

## 5. Canvas <-> mask coordinate system

Unchanged from Sprint 2's approach, extended to a second canvas: every stroke -- draw,
erase, or AI mask -- converts screen/pointer coordinates to SOURCE IMAGE coordinates via
`toSourceCoords()` (accounting for `getBoundingClientRect()`, zoom, and the active crop
offset) before ever touching a canvas context. All three raster surfaces (base image,
drawing layer, AI mask) are sized to `sourceWidth x sourceHeight` and rendered through the
identical `ctx.scale(zoom)` + `ctx.translate(-region.x, -region.y)` transform in `render()`.
There is no separate mask transform to drift -- it shares the same one used for everything
else, by construction, not by careful synchronization.

## 6. FastAPI endpoint

`POST /api/v1/inpaint` (multipart/form-data: `image`, `mask`, `prompt`, optional
`feather_radius`). Validation order: prompt non-empty and under 500 chars -> feather_radius
within [0, 40] -> image is a real, decodable image -> mask is a real, decodable image whose
dimensions exactly match the image's. Any failure returns a clean 400 with a user-safe
message -- no stack traces. See `backend/app/api/inpaint.py`.

## 7. Provider abstraction

`InpaintingProvider` (abstract base class, `backend/app/services/inpainting/base.py`) with
one method: `inpaint(image_bytes, mask_bytes, prompt) -> InpaintResult`. A factory
(`factory.py`) reads `ASTRA_INPAINT_PROVIDER` from the environment and returns the matching
implementation -- currently only `"mock"` is implemented; the factory has commented-out stubs
showing exactly where `FluxInpaintingProvider`/`SdxlInpaintingProvider` would plug in later
with zero changes to the API route, the frontend, or the engine.

## 8. AI provider/mock used

`MockInpaintingProvider` -- no real model, no credentials invented or required. It applies a
deterministic transform (hue shift derived from a SHA-256 hash of the prompt, plus a blur and
saturation boost) **only inside the masked region**, composited back with `Image.composite()`
using the feathered mask as the blend alpha. A small "ASTRA MOCK AI" watermark is drawn in
the corner so mock output can never be mistaken for a real model result during review.
Verified live: two different prompts against the same image+mask produced visibly different,
individually repeatable results (see manual QA, 17), with the untouched region provably
unchanged.

## 9. Mask feathering implementation

`backend/app/services/mask_utils.py`: `feather_mask(mask, feather_radius)` applies a Pillow
`ImageFilter.GaussianBlur(radius=feather_radius)` to a **copy** of the binary mask -- the
original binary mask passed in is never mutated. Default radius is 6px (config setting
`inpaint_default_feather_radius`), user-adjustable up to 40px via the `feather_radius` form
field, exposed in the frontend as a slider in the AI Edit panel.

## 10. AI result handling

`CanvasEngine.applyAiResult(resultImageUrl)`: decodes the returned image, sets it as the
engine's active `sourceImage`, sets `doc.baseImageOverride = resultImageUrl`, clears the AI
mask, re-renders, and calls `commit()` -- exactly one history checkpoint. Existing text/shape
objects and the drawing layer are left completely untouched; only the base image pixels
change. Hands control back to the Select tool afterward (via the same `onToolChange`
callback pattern used for the Text tool in Sprint 2).

## 11. Undo/redo integration

This was the one genuinely new architectural piece needed for AI Edit. Previously,
`EditorDocument` had no way to represent "the base image itself changed" -- Sprint 1/2 never
needed to, since the base image was loaded once and never replaced. Sprint 3 adds
`baseImageOverride: string | null` to the document specifically so an AI result flows through
the *existing* history mechanism rather than inventing a parallel one:

- `restoreState(doc)` now also calls `syncBaseImageFromDoc()`, which compares the incoming
  `doc.baseImageOverride` against what's currently applied and, if different, asynchronously
  decodes and swaps `this.sourceImage` -- reverting to the originally-loaded image when the
  override is `null` (i.e. undo past the AI edit), or loading the override image when redoing
  back into it. Uses the same "supersede-safe" async pattern already established for the
  drawing layer in Sprint 2 (a pending-load guard that checks the document hasn't moved on
  again before applying a slow decode).
- Because `applyAiResult()` calls the normal `commit()`, undoing an AI result is
  indistinguishable, from the reducer's perspective, from undoing a draw stroke or a shape --
  no special-casing was needed in `frontend/lib/editor/reducer.ts` at all.

## 12. IndexedDB implementation

`frontend/lib/persistence/sessionStore.ts` -- a minimal wrapper storing at most one session
(Sprint 3 scope: single active editing session, not a project library) under a fixed key.
`saveSession`/`loadSession`/`clearSession`, all best-effort (a write failure never interrupts
editing -- caught and silently ignored, matching the "autosave should never get in the way"
requirement).

`useSessionAutosave.ts` debounces writes 1200ms after the last change to `state.asset` or
`state.canvas` -- never on a raw pointer movement, since it's downstream of the same commit
events that drive undo/redo, not of individual drag frames.

## 13. Layer architecture

Deliberately additive, not a rewrite: `doc.objects[]` (existing since Sprint 2) plus new
`visible`/`locked` fields on each object *is* the layer stack -- array position already was
z-order. New engine methods: `setObjectVisibility`, `setObjectLocked`, `moveObjectUp/Down`,
`deleteObject`, plus `setDrawingLayerVisibility`/`Locked` for the raster draw/erase layer.
Locked objects are skipped in hit-testing (can't be selected/dragged via the canvas) but
remain toggleable from the Layers panel. Hidden objects are skipped in both rendering and
export. Base Image is always listed but not toggleable (it *is* the canvas); it's labeled
"(AI edited)" in the panel whenever `baseImageOverride` is set. `LayersPanel.tsx` renders
this with per-row visibility/lock/reorder/delete controls.

## 14. Eraser implementation

**Unchanged from Sprint 2** -- after careful code review, no rewrite was needed. See 15 for
why, and 17 for the verification approach and its limits.

## 15. Explanation of how partial erasure works

The eraser was never implemented as "select and delete a stroke object" -- there is no stroke
object at all. Draw and erase both operate on one shared raster canvas (`layerCanvas`) via
the HTML5 Canvas 2D API's `globalCompositeOperation`:

- Draw uses `"source-over"` (paint new pixels).
- Erase uses `"destination-out"` (set alpha to 0 for exactly the pixels the new path
  touches -- every other existing pixel on the canvas is left bit-for-bit unchanged; this is
  a standard, spec-defined Canvas 2D behavior, not custom logic).

Because erasing is pixel-local by construction, erasing over the middle of a long stroke
removes only that middle region -- the API has no mechanism to affect anything outside the
path being stroked. This also means: other strokes on the same layer are untouched (same
reasoning), and -- separately and more importantly -- the eraser tool's code path
(`strokeTo()`) never reads or writes `doc.objects` at all, so it categorically cannot delete
a text or shape object; those are only removable via `deleteSelected()`/`deleteObject()`
through Select + Delete or the Layers panel. Each completed eraser drag produces exactly one
`commit()` call (on pointer-up, in `handlePointerUp`), giving one undo/redo checkpoint per
stroke, never per pointer movement.

## 16. UI fixes

- **Toolbar contrast**: inactive tool labels and AI Edit's mask controls now use `#94A3B8`
  (an accessible muted slate) instead of the previous plain `zinc-300`, matching the
  requested contrast target.
- **Bottom bar**: increased height/padding (`h-12`->`h-14`, tighter -> `px-5 py-2`), added
  `whitespace-nowrap`+`shrink-0` to the Undo/Redo/Reset buttons so their labels can't clip
  under pressure, and `relative z-10` on both the header and footer so neither can end up
  underneath the canvas's scroll container or the session-recovery overlay.
- **Scrollbar overlap**: added `[scrollbar-gutter:stable]` and extra bottom padding to the
  canvas's scroll container so an overlay-style scrollbar doesn't sit directly against
  canvas content near the bottom edge.
- **AI Edit "Soon" badge removed**: it's a real, working tool now, so the disabled
  placeholder from Sprint 1/2 is gone -- replaced with a small "AI" pill badge on the active
  tool button.
- One item from the brief -- "the floating N badge" -- could not be addressed with confidence:
  there was no screenshot or further description of what this refers to in Astra's actual
  current UI, and nothing in the existing codebase obviously matches "N badge" by name or
  function. Rather than guess and possibly touch the wrong element, this is flagged here for
  clarification rather than silently skipped.

## 17. Tests added

**Backend -- pytest, 22/22 passing** (11 carried over from Sprint 1/2 + 11 new):
```
test_inpaint_valid_request_succeeds
test_inpaint_missing_prompt_rejected
test_inpaint_prompt_too_long_rejected
test_inpaint_invalid_image_rejected
test_inpaint_invalid_mask_rejected
test_inpaint_mismatched_mask_dimensions_rejected
test_inpaint_missing_image_field_rejected
test_inpaint_missing_mask_field_rejected
test_inpaint_feather_radius_out_of_range_rejected
test_inpaint_is_deterministic_for_same_prompt
test_mock_provider_directly_produces_valid_png
```

**Frontend**: `tsc --noEmit`, `eslint .`, and `next build` all pass clean as of this report.

**Eraser**: I attempted an automated headless test (jsdom + node-canvas, driving the real
`CanvasEngine` class with simulated pointer events, reading back actual pixel alpha values)
to empirically prove partial erasure. The test was fully written but hit an unresolved
environment issue in this sandbox -- the script silently exited immediately after the jsdom
import, before any application code ran, with no thrown error to diagnose against. I spent
real time on this and could not root-cause it before needing to move on; I judged further
time there a bad trade against finishing the rest of the sprint. The test file was removed
rather than left in a broken state. Section 15's explanation is a from-first-principles
argument grounded in the Canvas 2D specification's `destination-out` behavior, not an
empirical result -- see 20 for the recommended follow-up.

## 18. Manual QA results

Performed against the running app over real HTTP (both servers live):

- Uploaded a 400x300 test image with a solid ellipse via `/api/v1/assets/upload` -- correct
  metadata returned.
- `/editor?assetId=...&assetType=image&fileName=...` (5onam.ai launch simulation) rendered
  successfully -- confirms the Sprint 2 external-launch path is undisturbed by Sprint 3
  changes.
- Ran the full inpaint pipeline twice against the same image with two different prompts --
  results were visually distinct, individually deterministic/repeatable, correctly bounded
  to the mask region with a visible feathered edge, background pixels outside the mask
  untouched, mock watermark present in both.
- Downloaded and re-verified both AI results as valid, correctly-dimensioned PNGs.
- Re-confirmed the Sprint 1/2 asset metadata endpoint still works unmodified.
- **Not performed**: live pointer-driven browser interaction (actually dragging to paint a
  mask, dragging to erase, clicking Layers panel controls, watching the recovery prompt
  appear after a refresh). As in the Sprint 1 and Sprint 2 reports, the browser automation
  tool was not available in this session. Everything above was verified via the real HTTP
  API, code review, and a fully clean type-check/lint/build -- not via an actual mouse in an
  actual browser. This remains the single most important gap to close before treating
  Sprint 3 as done.

## 19. AI latency measurements

Mock provider: **16-34ms** per request (measured across two live calls against a 400x300
test image). This is far below any threshold that would justify the async job-queue
architecture (`202 Accepted` + `job_id` + Celery/Redis) described as a future scaling stage
in the sprint brief -- correctly deferred, per the brief's own instruction not to build that
infrastructure before the direct-REST pipeline works. A real model provider (Flux/Fill,
SDXL-Inpaint) would very likely change this calculus significantly; latency should be
re-measured against whichever real provider is eventually wired in via the
`InpaintingProvider` abstraction before deciding whether to build the queue.

## 20. Known limitations

- **Eraser partial-erasure is unverified empirically** (17) -- architecturally sound
  per Canvas 2D spec semantics, but not proven by an automated or manual test this session.
- **No live browser interaction testing** of any Sprint 3 feature (18).
- **AI mask is raster, not per-stroke undoable** -- same tradeoff as the draw/erase layer from
  Sprint 2; painting/erasing the mask itself has no undo (by design -- it's pre-generation
  prep state, not a persisted edit), but this means an accidental mask-erase stroke can't be
  undone independently; Clear Mask is the recovery path.
- **`baseImageOverride` stores a backend URL, not embedded image data** -- simpler and avoids
  bloating `EditorDocument`/IndexedDB with base64 image data, but means a restored session
  (from IndexedDB, potentially days later) depends on that result still existing in the
  backend's local/temporary `storage/results/` -- which has no persistence guarantee across a
  backend restart (this was already a known limitation from Sprint 1/2's "no database yet"
  scope, now also relevant to AI results specifically).
- **IndexedDB session storage holds exactly one session** -- opening a second image doesn't
  version/stack sessions; it's explicitly single-session scope for Sprint 3, not a project
  library.
- **The "floating N badge" UI item is unresolved** (16) -- needs clarification on what
  specifically it refers to.
- **Mock AI provider only** -- no real model is wired in; the abstraction is ready but
  `ASTRA_INPAINT_PROVIDER` only recognizes `"mock"` today.

## 21. Security considerations

- No credentials were invented, hardcoded, or committed anywhere in the AI pipeline -- the
  mock provider needs none, and the factory's commented-out real-provider stubs show
  reading a key from its own environment variable as the intended pattern.
- The inpaint endpoint reuses the exact same image validation (real decode, not just
  extension/MIME sniffing) as the existing upload endpoint, plus its own dimension-matching
  and prompt-length checks.
- The prompt is never logged (`logger.warning` on provider failure logs only the provider
  name, explicitly not the prompt).
- `AstraLaunchContext.sessionToken` continues to be read-but-unused-and-unlogged, per Sprint
  2's established pattern -- no change needed for Sprint 3 since no new auth surface was
  added.
- IndexedDB session data lives entirely client-side in the user's own browser; it's not
  transmitted anywhere by the autosave mechanism itself.

## 22. Recommended Sprint 4 priorities

1. **Live browser QA pass** (18) -- now the single highest-value, lowest-effort next step;
   nothing else in this report can be fully trusted as "done" until a human clicks through
   mask painting, layer reordering, and session recovery in an actual browser.
2. **Resolve the eraser test tooling issue, or replace it with a lighter-weight approach**
   (17) -- possibly a pure-canvas-API unit test without jsdom's DOM layer at all, using only
   `node-canvas` directly against a hand-rolled minimal harness instead of the full engine's
   pointer-event system.
3. **Wire a real inpainting provider** behind the existing `InpaintingProvider` abstraction,
   then re-measure latency (19) to decide if the async job-queue architecture is actually
   needed yet.
4. **Clarify the "floating N badge" UI request** (16) so it can be addressed correctly.
5. **Persist AI/edit results more durably** -- the `storage/results/` local-filesystem
   approach (unchanged since Sprint 2) is increasingly the weak link now that both Save and
   AI Edit depend on it; worth revisiting once any real backing store is introduced.
