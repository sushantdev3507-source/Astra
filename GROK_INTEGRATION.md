# Astra - Grok AI Edit Integration + Export Menu Consolidation Report

## 1. Files changed

```
NEW:
backend/app/services/inpainting/grok_provider.py     GrokImageProvider
backend/tests/test_grok_provider.py                   20 unit tests
frontend/lib/project/astraFile.ts                     .astra format: serialize/parse
frontend/lib/export/multiPageExport.ts                All Pages capture + PDF generation

MODIFIED:
backend/app/config.py                          grok_api_key, grok_image_model
backend/app/services/inpainting/factory.py     "grok" as a valid AI_PROVIDER value
backend/app/api/inpaint.py                     /ai/status reports "grok" + configured/model
backend/.env.example                           Grok variable names + setup notes
frontend/lib/ai/inpaintClient.ts               AiProviderStatus.provider widened to include "grok"
frontend/components/editor/BackendStatusIndicator.tsx   "Grok" label added
frontend/lib/api/assets.ts                     getAssetFileUrl() now passes data: URIs through
                                                 unchanged (was being wrongly prefixed -- found
                                                 and fixed while building .astra portability)
frontend/components/editor/Header.tsx          full rewrite -- see \u00a75-8
frontend/package.json                          added jspdf (client-side PDF generation)
```

## 2. Exact Grok API/model used

**Model**: `grok-imagine-image` (xAI's standard-tier Imagine model, $0.02/image).

**Deliberately NOT defaulted to `grok-imagine-image-2.0`** -- that model shipped
to xAI's consumer apps (grok.com/imagine, iOS, Android) on 2026-08-07, but
developer API access for it was still listed as "coming soon" in xAI's own
launch coverage as of that release. Using it as the default would have meant
shipping a provider that might not actually work via the API it's supposed to
call. `grok-imagine-image-quality` (higher-quality tier, $0.055-0.07/image) is
confirmed available today and can be selected via `ASTRA_GROK_IMAGE_MODEL`
with no code change.

**Endpoint**: `POST https://api.x.ai/v1/images/edits` -- confirmed live from
current `docs.x.ai` documentation, not assumed from training data, per this
sprint's explicit instruction. Notably: this endpoint requires a JSON body,
NOT multipart/form-data -- xAI's own docs specifically warn that the OpenAI
SDK's `images.edit()` method (which uses multipart) is incompatible with this
API for that reason. This adapter sends raw JSON with the image embedded as a
base64 `data:` URI, matching the documented contract exactly.

## 3. Does the selected model actually support image editing?

**Yes, confirmed before implementation** (per this sprint's explicit,
critical instruction not to assume image-understanding implies image-editing
capability). Verified via current xAI documentation: `grok-imagine-image`
genuinely takes an input image + natural-language instruction and returns an
edited image, not just text describing one. This is a real, dedicated
image-to-image editing capability, distinct from (and confirmed separately
from) Grok's general chat/vision understanding.

## 4. AI Edit request/response flow

Identical shape to the existing Gemini/Pollinations integration -- no second
pipeline:

```
Frontend AI Edit UI (unchanged)
      |
POST /api/v1/inpaint (unchanged)
      |
inpaint_pipeline.py (unchanged)
      |
factory.get_inpainting_provider() -- returns GrokImageProvider when
                                       AI_PROVIDER=grok
      |
GrokImageProvider.inpaint(image_bytes, mask_bytes, prompt)
      |
POST https://api.x.ai/v1/images/edits
  { "model": "grok-imagine-image", "prompt": "...",
    "image": { "type": "image_url", "url": "data:image/png;base64,..." } }
      |
xAI returns { "data": [{ "url": "https://imgen.x.ai/..." }] }
      |
Adapter fetches that URL to get the actual edited image bytes
      |
Edited image -> stored as an asset -> job result -> Astra canvas
(baseImageOverride, the SAME mechanism every other AI edit already uses)
```

**Consecutive-edit correctness**: no new fix was needed -- this is the same
mechanism already verified correct for Gemini and Pollinations (the engine's
`baseImageOverride`/`exportBaseImageForAi()` always reflects current canvas
state, provider-agnostically). `test_grok_provider_has_no_state_that_persists_between_calls`
specifically re-confirms the provider object itself caches nothing between
two sequential, differently-imaged/prompted calls.

## 5. Save implementation

**"Save" now lives inside the Export menu, under Project, and makes NO
backend request of any kind.** It calls `serializeProjectToBlob()`
(`frontend/lib/project/astraFile.ts`), which gathers the complete current
multi-page state and triggers a browser download of a `.astra` file --
entirely client-side. The old standalone Save button (which uploaded a PNG to
the backend's `storage/results/` folder) has been **completely removed**, not
hidden or aliased -- confirmed live: zero elements matching "Save" as a
standalone button exist anywhere in the toolbar.

The underlying backend result-save endpoint (`POST /assets/{id}/result`)
was **not deleted** -- per the brief's explicit "do not remove the underlying
serialization functionality" -- it's simply no longer called by anything in
the UI. It remains available for potential future use.

## 6. `.astra` serialization format used

**Reused the existing multi-page session shape** (`PersistedSession`'s
`pages`/`pageOrder`/`activePageId` fields, mirroring `PageRecord` exactly --
see `lib/persistence/sessionStore.ts`) rather than inventing a second project
format, per the brief's explicit instruction. The one addition: every image
reference (each page's base asset, and any AI-edited `baseImageOverride`) is
embedded as a base64 `data:` URI instead of a backend URL, so the file is
genuinely self-contained and portable -- it must still open correctly on a
different machine or after the original backend session no longer exists,
which a bare URL reference could never survive.

**"Open Project" reuses the exact existing `page/restoreAll` reducer action**
-- the same one IndexedDB session recovery already uses. A `.astra` file and
a recovered session are treated as the same shape by design; no second
restore mechanism was built.

**Real bug found and fixed while building this**: `getAssetFileUrl()`
unconditionally prefixed any non-`http` URL with the API base, which would
have mangled an embedded `data:` URI into something like
`http://localhost:8000data:image/png;base64,...`. Fixed to pass `data:` URIs
through unchanged, verified live via the full Save -> Open Project round-trip
below.

## 7. Export menu structure

Exactly as specified, confirmed live via screenshot (nothing extra, nothing missing):

```
Export
  Project
    Save            (downloads .astra, no backend call)
    Open Project     (reuses page/restoreAll)
  Download
    [PNG] [JPG] [WebP] [PDF]   <- format selector
    [Current Page] [All Pages] <- scope selector ("All Pages" disabled
                                   when the project has only one page)
    [Download]        <- single action button, uses the two selections above
  Clipboard
    Copy Image        (hidden entirely if the browser doesn't support it)
  Print
    Print
```

No Share. No Copy Link. No Export Project. No standalone Save button anywhere.

## 8. Export formats implemented

- **PNG / JPEG / WebP**: all three go through the existing `engine.exportToBlob()`,
  which was previously typed to only accept PNG/JPEG -- widened to also accept
  `image/webp`. This was a pure type change; `canvas.toBlob()` already supports
  WebP natively in every browser this app targets, so no new rendering logic
  was needed.
- **PDF**: new. Added `jsPDF` (client-side, no backend involvement). Each PDF
  page is sized to match that page's own actual pixel dimensions (converted to
  points at 96 DPI) rather than forcing everything onto a fixed Letter/A4 size.
- **Current Page**: exports only the active page's current canvas state.
- **All Pages**: see \u00a79 for the honest explanation of how this actually works
  and its real limitation.

## 9. Print implementation

Unchanged in mechanism from the prior round (carried over, re-verified live
in this new menu): opens a dedicated popup window containing only the
exported image, then calls the browser's native `window.print()` on that
popup -- never on the main app page, so toolbar/sidebar/properties panel are
never at risk of appearing in print output (there was never a code path that
could include them, since the popup's DOM contains nothing else). Closes
itself automatically after the print dialog completes.

## 10. Clipboard implementation

Unchanged in mechanism, re-verified live: `navigator.clipboard.write()` with
a `ClipboardItem` wrapping a PNG blob (Clipboard image writes are PNG-only in
every browser that supports this API at all, regardless of the format
selected in Download). Feature-detected -- the menu item is hidden entirely
in browsers/contexts that don't support it, rather than shown and failing.

## 11. Test results

**Backend**: 95/95 passing (20 new for Grok; 75 pre-existing, all still
green). `test_grok_provider.py` specifically verifies: initialization,
missing-key rejection, configurable model (and that the *default* is
deliberately NOT 2.0), the real JSON request shape (endpoint, headers, model,
embedded image bytes -- catching exactly the "text-only call pretending to
edit the image" mistake), mask-as-second-image handling, 401/429/network/
malformed-response error handling, factory selection alongside Gemini and
Pollinations without disturbing either, and no state leaking between two
sequential differently-imaged calls.

**Frontend**: `tsc --noEmit`, `eslint .`, and `next build` all clean.

**Live browser verification performed** (this is the part that actually
matters most for this round, given how much new async orchestration is in
the Export menu):

| Test | Result |
|---|---|
| Confirm zero standalone "Save" buttons exist anywhere | PASS |
| Export menu shows exactly the specified structure | PASS (screenshot) |
| Save -> real `.astra` file downloads, contains embedded `data:` URI (not a backend URL), correct objects | PASS -- inspected the actual downloaded file's JSON content directly |
| Open Project, in a completely fresh browser session with nothing else loaded, from that downloaded file | PASS -- image, shape, and text object all correctly reconstructed |
| All Pages export (PNG), 2 pages with different images | PASS -- two correctly-named, correctly-ordered files downloaded; pixel content verified (page 1 blue, page 2 orange); view correctly returned to the originally-active page afterward |
| All Pages export (PDF), 2 pages | PASS -- real 2-page PDF, correct page count via `pdfinfo`, correct page dimensions, both pages' content independently verified by rendering and viewing them |
| Copy Image | PASS -- "Copied \u2713" feedback shown |

**NOT performed**: live inference against the real Grok API (no
`ASTRA_GROK_API_KEY` available in this environment -- same honest gap as
every other real AI provider integrated so far in this project).

## 12. Known browser/API limitations

- **All Pages export is not invisible background work.** The live
  `CanvasEngine` only ever holds one page's state at a time (by design --
  see the reducer's page-mirror architecture). Exporting every page means
  actually switching through each one via the same mechanism the page tabs
  use, so the user visibly sees the canvas flicker through each page during
  the export. This is a real, honest tradeoff, not a bug -- building a true
  headless/background renderer for inactive pages would be a much larger
  architectural change, out of this sprint's focused scope.
- **All Pages -> non-PDF formats trigger one browser download per page**,
  since multiple image files can't be bundled into a single download the way
  a multi-page PDF naturally can. Each is clearly numbered and named by its
  page.
- **Page-load detection during All Pages export uses a polling+timeout
  heuristic** (comparing the live engine's reported document dimensions
  against the target page's known dimensions), not a proper completion
  signal from the engine, since none currently exists. Reliable for the
  local/embedded-data-URI image loads this app deals with in every test
  performed above, but not a hard guarantee under all conditions -- worth
  revisiting if a genuinely async/slow image source is introduced later.
- **Grok's mask support is unconfirmed, same honest caveat as Gemini and
  Pollinations** -- see `grok_provider.py`'s module docstring. xAI's
  documented multi-image editing is for compositing multiple subjects, not
  described anywhere as spatial mask/inpainting guidance. When a mask is
  supplied, it's sent as a second reference image with explanatory text, on
  a best-effort basis.
- **Clipboard image copy requires a secure context** (HTTPS or localhost) and
  is not supported in every browser -- correctly feature-detected and hidden
  where unavailable, per the requirements.

## 13. Remaining backend requirements

None for either half of this sprint to function as built. Save/Open
Project/PDF/WebP/Print/Copy Image are all entirely client-side. Grok requires
only `ASTRA_GROK_API_KEY` to be set for live use -- no other backend
infrastructure changes are needed beyond what's already shipped.
