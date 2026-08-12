# Astra - Gemini AI Edit Integration Report

## 1. Summary

Integrated Google Gemini (gemini-3.1-flash-image) into Astra's existing AI
Edit pipeline as a new `InpaintingProvider` implementation, alongside the
existing mock and Replicate providers -- no duplicate pipeline, no new
endpoint, no editor rewrite. The core scope change this sprint required:
mask became genuinely OPTIONAL end-to-end (API, job queue, all three
providers), since Gemini is a conversational, instruction-driven model that
doesn't need one, and two of the sprint's six acceptance tests specifically
require working without a painted region.

**Honesty check, consistent with every prior sprint in this project**: no
Gemini API key exists in this environment. The provider is fully
implemented against Google's current, documented API contract (verified by
searching current Google documentation before writing any code, not
assumed from training data), and its own internal logic is unit-tested
with mocked HTTP responses -- but live inference against the real Gemini
API has NOT been executed or verified. What HAS been verified live: the
entire pipeline change (optional mask, provider selection, job flow) using
the mock provider as the payload, through both direct API calls and the
actual browser UI.

## 2. Files changed

```
NEW:
backend/app/services/inpainting/gemini_provider.py   GeminiImageProvider
backend/tests/test_gemini_provider.py                 8 unit tests (mocked HTTP)
backend/.env.example                                   did not exist before this sprint -- created

MODIFIED:
backend/app/services/inpainting/base.py                mask_bytes now Optional[bytes]
backend/app/services/inpainting/factory.py              "gemini" as a valid AI_PROVIDER value
backend/app/services/inpainting/mock_provider.py        handles mask=None (whole-image edit)
backend/app/services/inpainting/real_provider.py        mask=None now a clean, honest error (Replicate needs a mask)
backend/app/services/inpaint_pipeline.py                mask validation/feathering skipped entirely when absent
backend/app/jobs/tasks.py                                mask_b64 now Optional[str]
backend/app/jobs/store.py                                submit_job's mask_bytes now Optional[bytes]
backend/app/api/jobs.py                                  mask upload field now optional
backend/app/api/inpaint.py                               /ai/status reports "gemini" + supportsMaskless
backend/app/schemas/ai_status.py                         AiStatusResponse gains supportsMaskless
backend/app/config.py                                    ASTRA_GEMINI_API_KEY / ASTRA_GEMINI_MODEL
backend/tests/test_inpaint.py                            outdated "mask required" test replaced; new maskless + Replicate-rejects-maskless tests

frontend/lib/hooks/useAiEdit.ts                          removed the "must paint a mask" guard
frontend/lib/ai/inpaintClient.ts                          maskBlob is now Blob | null; omitted from the request when absent
frontend/components/editor/Toolbar.tsx                    AI Edit panel copy updated -- mask is optional, new placeholder example
```

No changes to Text, Shape, Crop, Draw, Eraser, Layers, session recovery,
5onam.ai integration, or the multi-page model -- all explicitly out of
scope and confirmed untouched.

## 3. Architecture

Reused the existing abstraction rather than introducing a parallel one, per
the sprint's explicit instruction:

```
Astra Frontend (existing AI Edit UI, unchanged in shape)
      |
      v
POST /api/v1/inpaint   (existing endpoint, mask now optional)
      |
      v
FastAPI -> app/services/inpaint_pipeline.py   (existing pipeline, unchanged shape)
      |
      v
InpaintingProvider (existing interface)
      |
      +-- MockInpaintingProvider     (existing, now also handles no-mask)
      +-- RealGenerativeAIProvider   (existing, Replicate/FLUX.1 Fill -- now explicitly mask-only)
      +-- GeminiImageProvider        (NEW)
      |
      v
Edited image -> stored as an asset -> job result -> Astra canvas
(baseImageOverride, same mechanism every other AI edit already used)
```

`GeminiImageProvider` did not require a new endpoint. The existing
`/api/v1/inpaint` -> job -> `/api/v1/jobs/{id}` flow (built in Sprint 4)
already accepted image + mask + prompt over multipart form data and
already had async job handling for slow real-model latency -- exactly
what a real Gemini call needs. Extending it (making mask optional) was
preferable to a parallel `/api/v1/ai-edit` endpoint, per the sprint's own
explicit "do not duplicate functionality" instruction.

## 4. Gemini model/API used

**Model**: `gemini-3.1-flash-image` (Google's current conversational image
generation/editing model, sometimes called "Nano Banana").

**API**: Google's Interactions API (`POST
https://generativelanguage.googleapis.com/v1beta/interactions`) -- NOT the
older `generateContent` REST shape. This was verified against current
Google documentation before implementation, specifically because the
sprint brief warned against assuming an unsupported model/API shape from
training data. Google migrated to this API with a breaking change in May
2026; the implementation sends the `Api-Revision: 2026-05-20` header to
opt into the current structured response format.

**Auth**: `x-goog-api-key` header, read from `ASTRA_GEMINI_API_KEY`.

## 5. Request/response flow

**Request** (`GeminiImageProvider.inpaint`):
```json
{
  "model": "gemini-3.1-flash-image",
  "input": [
    {"type": "text", "text": "<system guidance>\n\nInstruction: <user prompt>"},
    {"type": "image", "mime_type": "image/png", "data": "<base64 source image>"},
    {"type": "text", "text": "<mask guidance -- only if a mask was painted>"},
    {"type": "image", "mime_type": "image/png", "data": "<base64 mask -- only if present>"}
  ]
}
```

The system guidance text (sent on every request) explicitly instructs the
model to: preserve unaffected regions, preserve faces/identities, modify
only what's requested, reconstruct removed regions naturally, and respect
the mask when one is present -- directly implementing the sprint's prompt
handling requirements without a hardcoded if/else command list.

**Response parsing** (`_extract_image_bytes`): deliberately defensive --
walks the response looking for an image content block in either the
current documented `steps[].content[]` shape or a flatter `outputs[]`
shape, rather than indexing one exact assumed path. This is extra
resilience specifically because the response shape could not be verified
against a live call in this environment. If Gemini returns text only (it
declined, or safety-filtered the request), this returns `None` and the
provider raises a clean `InpaintingProviderError` -- never silently
"succeeds" with no image.

## 6. Mask support

Mask is genuinely optional now, end-to-end, not just at the very top of
the stack:

- **No mask painted**: request omits the mask entirely. Gemini receives
  image + instruction only and is expected to identify the target region
  itself semantically (e.g. "the man behind the two people in front") --
  this is exactly Test 1 and Test 5's scenario. The mock provider
  simulates this by applying its category effect to the whole image
  (mock has no real region-understanding, so this is the honest
  approximation).
- **Mask painted**: sent as a second image with explanatory text asking
  Gemini to constrain the edit to the white region. This is guidance, not
  a hard pixel-level constraint the way traditional inpainting models use
  a mask -- an architectural difference worth being explicit about (see
  Known Limitations).
- **Replicate (FLUX.1 Fill)**: still mask-only, and now says so honestly.
  Calling it without a mask raises a clear `InpaintingProviderError`
  telling the user to either paint a mask or switch to Gemini -- rather
  than silently ignoring the missing mask or crashing.

## 7. Consecutive-edit fix

No new fix was required here -- traced the existing mechanism (per this
sprint's instruction not to assume it's already solved) and confirmed it
already satisfies the requirement:

`applyAiResult()` (`html-tool/src/engine.ts`) sets
`doc.baseImageOverride` to the just-received result and commits it through
the exact same history/undo-redo pipeline every other edit uses. The
NEXT AI Edit call exports the CURRENT canvas state (`exportBaseImageForAi()`),
which reflects `baseImageOverride` if one is set -- so a second edit
automatically operates on the first edit's result, never the original
upload, by construction. This was already proven correct in a prior
sprint's live browser QA (three chained edits, each correctly reflecting
only its own region/prompt, verified with screenshots) and required no
changes for Gemini -- the mechanism is provider-agnostic.

A per-call generation-id guard (already existing) additionally discards
any out-of-order network response from a superseded call, so a fast
second request can never have its result overwritten by a slow first
request's late-arriving response.

## 8. Error handling

Implemented and unit-tested:
- Missing/empty Gemini API key -- provider construction itself fails with
  a clear error (factory never even attempts a request without a key).
- Invalid/unauthorized key (401/403 from Gemini) -- clean error, no key or
  internal detail leaked to the client.
- Rate limit (429) -- distinct, clean error message.
- Any other 4xx/5xx from Gemini -- clean error including the status code,
  nothing else.
- Malformed/non-JSON response -- clean error, doesn't crash the request.
- No image in the response (text-only reply, e.g. declined/safety-filtered) --
  clean error, never silently treated as success.
- Network/timeout errors -- clean error, distinct message.
- Replicate called without a mask -- clean, actionable error (see \u00a76).

On any failure, the existing job/pipeline error handling (already built in
Sprint 4) applies unchanged: the current image is never destroyed, the
mask and prompt are left untouched so the user can retry without
repainting, and the job status endpoint reports `failed` with a clean
message.

## 9. Frontend integration

Minimal, per the sprint's explicit "do not redesign the existing UI"
instruction:
- Removed the hard block that previously required painting a mask before
  Generate would even attempt a request.
- `requestInpaint()`'s mask parameter is now `Blob | null` -- omitted
  from the multipart request entirely when absent, rather than sending an
  empty/placeholder mask.
- AI Edit panel copy updated to explain mask is optional and give an
  example matching the sprint's own Test 1 scenario.
- Verified live, through the actual browser UI (not just curl): typed a
  prompt with zero mask painted, clicked Generate, result applied
  correctly, Undo enabled, Layers panel correctly shows "Base Image (AI
  edit...)".

No other editor UI was touched -- Text, Shape, Crop, Draw, Eraser, the
toolbar shell, and the properties panel are all unchanged.

## 10. Test results

**Backend: 41/41 passing.**
- 8 new Gemini provider unit tests (`test_gemini_provider.py`) -- mocked
  HTTP, verify request construction (correct model, correct auth header,
  actual image bytes present -- specifically catching the sprint's warned
  against "text-only call pretending to edit the image" mistake), response
  parsing against both documented shapes, and every error path in \u00a78.
- 1 new test confirming Replicate cleanly rejects a maskless request.
- 1 replaced test: the old "missing mask -> 422" assumption is now
  correctly "missing mask -> 202, completes successfully" (mask is
  legitimately optional now).
- All 32 pre-existing tests (sequential AI edits, named-color fixes,
  eraser-adjacent regression tests, etc.) still pass unchanged.

**Frontend**: `tsc --noEmit`, `eslint .`, and `next build` all clean.

**Live, end-to-end verification performed** (mock provider as the
payload, since no Gemini credentials exist):
- Maskless request via direct API call -- confirmed `202` accepted, job
  completed, correct whole-image result.
- Maskless request through the ACTUAL browser UI -- typed a prompt,
  painted nothing, clicked Generate, watched it complete correctly with
  no blocking "paint a mask" error, confirmed the Layers panel and Undo
  button updated correctly.

**NOT performed, honestly**: any of the six acceptance tests against the
REAL Gemini model (all six describe semantic, instruction-driven edits --
"remove the man behind the two people," "change the shirt to blue," "add a
duck" -- that only a real model can actually attempt; the mock's
category-based transforms are a structural stand-in for pipeline testing,
not a substitute for verifying Gemini's actual editing quality). This
requires a real API key.

## 11. Known limitations

- **Live Gemini inference is unverified** (\u00a71, \u00a710) -- the single
  biggest open item. The adapter is ready; this is now purely a
  credentials/testing task.
- **Response parsing is defensive/best-effort**, not verified against a
  real response payload (\u00a75) -- if Gemini's actual response shape
  differs from current documentation in some way the defensive search
  doesn't anticipate, this would surface as a clean "no image returned"
  error rather than a crash, but the edit would still fail. Worth a
  focused test the moment real credentials are available.
- **Mask-as-guidance vs. mask-as-constraint**: Gemini's mask handling is
  fundamentally conversational guidance ("please stay within this
  region"), not the hard per-pixel constraint a true inpainting model
  provides. For a request where precise boundary adherence matters, this
  may behave differently than users familiar with the Replicate/FLUX
  provider would expect. Worth calling out in any user-facing
  documentation once this ships.
- **The mock provider's "maskless" behavior is a whole-image effect**, not
  genuine region understanding -- it cannot actually identify "the man
  behind the two people" the way real Gemini would. This is an honest,
  correctly-scoped limitation of the mock, not a bug.
- **No live browser QA on Windows/the actual target deployment
  environment** -- as with every prior sprint, verification happened in
  this sandboxed Linux environment via Playwright + a real Chromium
  instance, not the person's actual machine.

## 12. Recommended next priorities

1. **Obtain a real Gemini API key and run all six acceptance tests against
   it.** This is the one item that actually validates whether this
   integration works as intended -- everything else in this report is
   necessary-but-not-sufficient groundwork for that moment.
2. **Re-verify the response-parsing logic against a real payload**
   specifically (\u00a711) -- the single highest-risk unverified assumption.
3. Consider whether Replicate's mask-only limitation should be surfaced
   more visibly in the UI (e.g. disabling Generate-without-a-mask when
   Replicate is the active provider, rather than only erroring after
   submission) -- currently a backend-enforced, cleanly-erroring
   limitation, but a proactive UI hint would be a nicer experience.
