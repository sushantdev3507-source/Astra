# Astra — Sprint 2 Report

## 1. Files created

```
html-tool/package.json
html-tool/README.md
html-tool/src/types.ts
html-tool/src/engine.ts

frontend/lib/canvas-engine/index.ts
frontend/lib/editor/EngineContext.tsx
frontend/lib/hooks/useKeyboardShortcuts.ts
frontend/lib/integration/launchContext.ts
frontend/lib/integration/resolveAsset.ts
frontend/lib/integration/result.ts
frontend/app/dev/launch-astra/page.tsx
frontend/public/branding/astra-logo-placeholder.png

SPRINT2_REPORT.md (this file)
```

## 2. Files modified

```
frontend/lib/editor/types.ts        - CanvasSnapshot is now the real EditorDocument
frontend/lib/editor/reducer.ts      - added canvas/init action; asset/set no longer fakes a snapshot
frontend/components/editor/Canvas.tsx        - now creates/drives a real CanvasEngine
frontend/components/editor/Toolbar.tsx       - wired to engine.setTool + tool option controls
frontend/components/editor/StatusBar.tsx     - zoom now goes through the engine
frontend/components/editor/PropertiesPanel.tsx - context-aware (text/shape editing)
frontend/components/editor/Header.tsx        - logo, real Save (backend), real Export (engine)
frontend/components/editor/EditorShell.tsx   - EngineProvider, keyboard shortcuts, launch resolution
frontend/app/editor/page.tsx         - reads and forwards launch query params
frontend/lib/api/assets.ts           - added getAssetById(), moved to /api/v1
frontend/lib/api/health.ts           - moved to /api/v1
frontend/next.config.ts              - experimental.externalDir (see known limitations)

backend/app/config.py                - added results_dir
backend/app/api/health.py            - relative path, mountable at both /api and /api/v1
backend/app/api/assets.py            - relative path; added GET /{id}, POST /{id}/result
backend/app/schemas/asset.py         - added AstraEditResult, AssetMetadataResponse
backend/app/services/asset_service.py - added metadata sidecar, get_asset_metadata, save_edit_result
backend/app/main.py                  - mounts /api/v1 (canonical) + /api (legacy alias)
backend/tests/test_api.py            - added 4 tests for the above

README.md                            - rewritten for Sprint 2
```

No files were deleted. Sprint 1's architecture (Next.js UI/routing, FastAPI
processing, REST transport, generic Asset abstraction) was extended, not
replaced.

## 3. HTML5 Canvas architecture

`html-tool/src/engine.ts` exports `CanvasEngine`, a framework-agnostic class
with no React/Next.js import anywhere in `html-tool/`. It owns:

- **Rendering** - draws the base image, a drawing/annotation layer, then
  vector objects (text/shapes), then transient UI (selection handles, shape
  preview, crop overlay) directly onto a `<canvas>` you hand it via
  `initialize()`.
- **Pointer interaction** - attaches its own `pointerdown/move/up` listeners
  to the canvas and owns all drag/resize/rotate/draw/crop state machines.
  React never touches raw pointer events.
- **Coordinate system** - everything in `EditorDocument` and all object
  geometry is in **source image pixels**. Screen pixels only exist at the
  very edge (`toSourceCoords`), which accounts for `getBoundingClientRect()`,
  zoom, and the current crop region's offset in one place.
- **Serializable state** - `getState()` / `restoreState(doc)` round-trip a
  plain-JSON `EditorDocument` (`{ sourceWidth, sourceHeight, zoom, crop,
  drawingLayer, objects, selectedObjectId }`).
- **Export** - `exportToBlob('image/png' | 'image/jpeg')` renders the full
  composite (respecting crop, at source resolution, ignoring on-screen zoom)
  to an offscreen canvas and returns a real `Blob`.

## 4. Editor state model

`EditorDocument` (in `html-tool/src/types.ts`) is now literally the
`CanvasSnapshot` type used by the Sprint 1 reducer (`frontend/lib/editor/
types.ts`). Nothing in the reducer had to change structurally to
accommodate this - it was already generic over "whatever a snapshot is."

```ts
interface EditorDocument {
  version: 1;
  sourceWidth: number;
  sourceHeight: number;
  zoom: number;
  crop: CropRegion | null;
  drawingLayer: { dataUrl: string | null }; // rasterized draw/erase layer
  objects: (TextObject | ShapeObject)[];
  selectedObjectId: string | null;
}
```

Text and shapes are kept as **vector objects** (independently
movable/resizable/rotatable/editable). Draw and erase strokes are
**rasterized** into a single PNG data-URL layer on pointer-up - see the
known limitations section for the tradeoff this implies for undo
granularity.

## 5. Undo/redo implementation

Unchanged in spirit from Sprint 1, deliberately: the reducer's
`canvas/commit` / `history/undo` / `history/redo` actions and the
truncate-then-push history array are exactly what was built in Sprint 1.
What's new:

- `CanvasEngine` calls `onCommit(doc)` **once per completed action**
  (finished drag, finished stroke, finished crop-apply, finished text edit)
  - never per `pointermove`. This satisfies the "one checkpoint per stroke,
  not per mouse movement" requirement structurally, not by convention.
- A new `canvas/init` action resets history to a single starting snapshot
  once the engine finishes loading an image and knows its real dimensions
  (replacing the old Sprint 1 `INITIAL_CANVAS` placeholder approach).
- `Canvas.tsx` syncs `state.historyIndex` -> `engine.restoreState(state.canvas)`
  after undo/redo (and, harmlessly, after every fresh commit too - see
  known limitations).

## 6. React <-> html-tool interface

Two React contexts bridge the engine into the component tree:

- **`EditorProvider`** (Sprint 1, unchanged) - the reducer/history state.
- **`EngineProvider`** (new) - holds a `useRef<CanvasEngine | null>`.
  `Canvas.tsx` creates the actual `CanvasEngine` instance on mount and
  stores it in this ref; every other component (`Toolbar`, `StatusBar`,
  `PropertiesPanel`, `Header`, the keyboard-shortcuts hook) reads
  `useCanvasEngine()` and calls methods on it directly
  (`engineRef.current?.setTool(...)`, etc.), always guarding for `null`
  since the engine doesn't exist until an asset is loaded.

This keeps the low-level canvas logic entirely inside `html-tool/`, while
React stays responsible for layout, forms (e.g. the text/shape property
editors), and orchestration - matching the sprint's architectural rule.

## 7. Asset launch contract

`frontend/lib/integration/launchContext.ts`:

```ts
interface AstraLaunchContext {
  assetId?: string;
  assetUrl?: string;
  assetType: "image" | "pdf" | "pptx";
  fileName?: string;
  returnUrl?: string;
  sessionToken?: string; // never logged, never persisted
}
```

`parseLaunchContext(params: URLSearchParams)` returns `null` when neither
`assetId` nor `assetUrl` is present (the normal local-upload case), so the
editor's existing upload flow is completely unaffected when Astra is opened
without launch params.

`resolveLaunchAsset()` (`lib/integration/resolveAsset.ts`) turns a context
into a concrete `Asset`:
- `assetId` -> `GET /api/v1/assets/{id}` (new backend metadata endpoint)
- `assetUrl` -> used directly, synthesizing an `Asset` object client-side
  (this is explicitly the seam where a future signed/authenticated fetch
  would go once 5onam.ai's real contract exists)

`ExternalLaunchResolver` in `EditorShell.tsx` runs this once on mount when
`/editor` is opened with launch params, dispatching `asset/set` on success or
`upload/error` on failure (reusing the existing error-display UI).

## 8. Mock 5onam.ai launch flow

`frontend/app/dev/launch-astra/page.tsx` - not linked from anywhere in the
main app. Lets a developer pick a local file, uploads it through Astra's own
upload API (standing in for "an asset 5onam.ai already has"), then navigates
to `/editor?assetId=...&assetType=...&fileName=...&returnUrl=/dev/launch-astra`
- exactly the shape a real host-app launch would use. This is how the
external-asset path gets exercised without a real 5onam.ai integration
existing yet.

## 9. AstraEditResult contract

Defined in both places (frontend `lib/integration/result.ts`, backend
`schemas/asset.py`) with matching field names:

```ts
interface AstraEditResult {
  assetId: string;
  resultAssetId: string;
  assetType: "image" | "pdf" | "pptx";
  fileName: string;
  status: "saved" | "failed";
  url?: string;
}
```

This is **Astra's own internal contract**, not a 5onam.ai production API -
it exists so Save has something real to do today, and so a future 5onam.ai
return-flow integration has a stable shape to build against.

## 10. Export implementation

The Header's Export button calls `engine.exportToBlob(format)` directly -
`format` is a PNG/JPEG toggle in the header. This renders the actual edited
scene (base image + drawing layer + all text/shape objects, respecting an
applied crop) to an offscreen canvas at source resolution, ignoring the
on-screen zoom level, then downloads it via a `blob:` URL (same-origin by
construction, so no cross-origin download bug like Sprint 1 had before its
fix). This is a real fix/upgrade from Sprint 1, which downloaded the
original unedited upload.

## 11. FastAPI changes

- New `GET /api/v1/assets/{asset_id}` - metadata lookup by id, backed by a
  small JSON sidecar file written alongside each upload (`{id}.json` with
  `name`/`mimeType`) plus re-decoding width/height from the stored image via
  Pillow. This is **not a database** - it's the minimum needed for id-based
  lookup while staying within Sprint 2's "no DB yet" scope.
- New `POST /api/v1/assets/{asset_id}/result` - validates and stores an
  exported canvas the same way uploads are validated (extension, MIME,
  size limit, real image decode), under `storage/results/` with a fresh
  generated id, returns an `AstraEditResult`.
- `find_asset_file()` now checks both `storage/uploads/` and
  `storage/results/` so a `resultAssetId` is fetchable via the same
  `GET /{id}/file` endpoint uploads use.

## 12. API versioning status

`/api/v1/...` is now canonical. `/api/...` (Sprint 1's paths) is mounted as
a second, identical, `include_in_schema=False` alias of the same routers -
so nothing that depended on Sprint 1 URLs breaks. The frontend API client
was updated to call `/api/v1/...` everywhere. The new result-save endpoint
only exists under `/api/v1` (no legacy alias needed since it didn't exist in
Sprint 1).

## 13. Authentication integration readiness

No authentication was implemented (per explicit instruction not to invent
one). `AstraLaunchContext.sessionToken` exists as a typed field, is read
from the URL if present, and is **never logged, never sent anywhere, never
stored** in Sprint 2 - it's purely a placeholder for where a future
5onam.ai-issued token would be threaded through to an authenticated asset
fetch and/or validated by FastAPI. `resolveAsset.ts` is the documented seam
for that future work.

## 14. CORS / proxy configuration

Unchanged from Sprint 1: explicit `CORS_ORIGINS` env-based allow-list on the
FastAPI side (`app/config.py`), no wildcard `*`. No Next.js rewrite/proxy
was added in Sprint 2 - direct CORS continues to be sufficient for local
dev, and switching to a Next.js API proxy later would only touch
`lib/api/client.ts`'s base URL resolution.

## 15. IndexedDB status

**Not implemented.** This was explicitly P2 ("if time allows") in the
sprint's priority order, and time was better spent finishing the P0 core
editor and the P1 integration contracts correctly. The persistence
abstraction itself (where a debounced IndexedDB write would hook in) is
straightforward given the existing `engine.getState()` / `restoreState()`
pair - it would live as a new hook (e.g. `useAutoSaveToIndexedDB(state.canvas)`)
that debounces writes and, on mount, offers to restore a found snapshot.
Recommended as early Sprint 3 work (see section 20).

## 16. Tests performed

**Backend - pytest, 11/11 passing:**
```
test_health_check                    (Sprint 1)
test_upload_valid_png                (Sprint 1)
test_upload_invalid_extension        (Sprint 1)
test_upload_spoofed_extension        (Sprint 1)
test_upload_empty_file               (Sprint 1)
test_get_nonexistent_asset           (Sprint 1)
test_path_traversal_rejected         (Sprint 1)
test_v1_health_check                 (new)
test_v1_upload_and_metadata_lookup   (new)
test_metadata_lookup_nonexistent     (new)
test_save_edit_result                (new)
```

**Frontend:**
- `npx tsc --noEmit` - clean
- `npx eslint .` - clean
- `npm run build` (production, Turbopack) - succeeds; routes:
  `/` (static), `/editor` (dynamic - reads search params), `/dev/launch-astra`
  (static)

**Manual, over real HTTP against both running servers:**
- Uploaded a real 500x350 PNG via `/api/v1/assets/upload` -> correct metadata
- `GET /api/v1/assets/{id}` metadata lookup -> correct name/dimensions
  (verifies the external-launch resolution path end-to-end at the API level)
- `/editor?assetId=...&assetType=image&fileName=...` renders successfully
- `POST /api/v1/assets/{id}/result` with a distinct edited image -> returned
  a different `resultAssetId`, `status: "saved"`
- Fetched the saved result back via `GET /api/v1/assets/{resultAssetId}/file`
  -> byte-valid PNG, correct dimensions
- SSR HTML for `/editor` contains: logo image, Save button, PNG/JPEG format
  selector, Export button, all six real tools (Select/Draw/Eraser/Text/
  Shape/Crop) plus the disabled AI Edit placeholder
- `/dev/launch-astra` renders and serves its upload UI

## 17. Manual browser verification

**Not performed with live pointer interaction.** As in the Sprint 1 report,
the browser-automation tool available in this environment was not reachable
this session, so I could not click-drag to actually draw a stroke, drag a
resize handle, or drag out a crop region and watch it render. Everything
above was verified via the real HTTP API, SSR output inspection, and the
type-checked/linted/built source - but the interactive pointer-event state
machines in `CanvasEngine` (drag-to-move, drag-to-resize, drag-to-rotate,
draw/erase strokes, shape drag, crop drag) have **not been exercised by an
actual mouse in a browser**. This is the single most important thing to
manually verify before treating Sprint 2 as done - open `/editor`, upload an
image, and go through Select/Draw/Eraser/Text/Shape/Crop/Zoom/Undo/Redo/
Export/Save by hand.

## 18. Known limitations

- **Redundant restoreState calls**: `Canvas.tsx` calls `engine.restoreState()`
  after every history-index change, including right after the engine's own
  commits (not just undo/redo). This is harmless (the document is already
  correct) but does force a layer-image reload each time - a minor,
  unoptimized inefficiency, not a correctness bug.
- **Resize/rotate hit-testing ignores current rotation** for the purposes of
  which corner handle you grabbed (the handles themselves are drawn rotated
  correctly, and dragging works, but very oblique rotations may make corner
  hit-testing feel slightly imprecise).
- **Eraser is raster, not vector**: draw/erase strokes live in one flattened
  PNG layer. Undo restores that whole layer to its pre-stroke state (correct
  behavior), but there's no way to undo "just the eraser part" of a layer
  independently of other strokes drawn before it in the same session, since
  they're not separately tracked objects. This was a deliberate scope
  tradeoff - see `html-tool/README.md` for the reasoning.
- **Crop hides, doesn't delete, out-of-bounds objects**: clearing a crop
  brings previously out-of-frame text/shapes back. Documented behavior, not
  a bug, but worth calling out since it's a design choice.
- **`next.config.ts` needed `experimental.externalDir: true`** to let the
  frontend import `html-tool/` (which deliberately lives outside
  `frontend/`, per the sprint's architecture requirement). This is a
  Turbopack/webpack constraint, not an Astra design flaw, but it's the kind
  of thing that could break on a future Next.js major version - worth a
  comment/test in CI eventually.
- **No asset metadata database**: the JSON sidecar approach for
  `GET /api/v1/assets/{id}` is intentionally minimal (per "no DB yet" scope)
  and won't survive well past a handful of assets - no listing/searching,
  no cleanup/expiry policy.
- **IndexedDB recovery**: not implemented (see section 15).
- **No authentication**: anyone who can reach the backend can upload, fetch,
  or save results for any asset id they can guess/enumerate.

## 19. Technical debt

- The engine's pointer-event handlers are one large class with several
  `if (this.dragMode === ...)` branches in both `handlePointerMove` and
  `handlePointerUp`. Functionally correct, but would benefit from being
  refactored into small per-mode strategy objects if more tools are added
  in Sprint 3 (e.g. a proper AI-selection/mask tool).
- `resolveAsset.ts`'s `assetUrl` branch synthesizes a fake `Asset.id`
  (`external_${Date.now()}`) since there's no real backend record for a
  purely-URL-referenced asset. This is fine for viewing/editing, but Save
  for a URL-launched asset would currently save under that synthetic id
  rather than anything 5onam.ai could correlate back - this needs 5onam.ai's
  actual contract to resolve properly, and is flagged rather than guessed at.
- Backend `_read_sidecar`/`_write_sidecar` JSON-file metadata is a stopgap;
  the moment Sprint 3 needs even basic listing/search of assets, this should
  become a real (even if lightweight, e.g. SQLite) datastore.

## 20. Recommended Sprint 3 work

1. **Manual browser verification first** (see section 17) - this is the
   highest-value, lowest-effort next step given everything else has been
   built and API/build-verified but not click-tested.
2. **IndexedDB crash recovery** (section 15) - the hook-shaped seam is ready
   (`engine.getState()`/`restoreState()`); this is now the natural next P1.
3. **Wire the AI Edit tool's request shape** (still disabled/no-op today) -
   the sprint spec's "current image, selected region, mask, prompt, editor
   state -> REST -> FastAPI -> AI model -> Canvas -> history checkpoint"
   flow fits cleanly onto the existing `onCommit`/`EditorDocument` plumbing.
4. **Replace the JSON-sidecar metadata store** with a real (lightweight is
   fine) datastore once asset listing/search/expiry becomes a real need.
5. **Resolve the `assetUrl`-launch save-identity gap** (section 19) once
   5onam.ai's actual contract exists.
6. **Begin PDF support** - the generic `AssetType`/`AstraLaunchContext`
   plumbing is already type-safe for `"pdf"`; the actual PDF rendering/edit
   surface is still greenfield.
