# Astra - Pollinations AI Provider Integration Report

## 1. Summary

Added Pollinations (gen.pollinations.ai) as a second real AI Edit provider,
alongside the existing Gemini and Replicate providers -- same
`InpaintingProvider` interface, no duplicate pipeline, no changes to the
existing Gemini integration. Provider selection now supports
`AI_PROVIDER=pollinations` through the same factory/config mechanism as
every other provider.

**Honesty check, consistent with every provider added to this project**: no
Pollinations API key exists in this environment. The provider is fully
implemented against Pollinations' current, live-fetched API documentation,
verified with 20 unit tests -- but live inference against the real API has
not been executed. Also worth flagging clearly, per this sprint's explicit
"do not fake mask support" instruction: Pollinations' documented editing
endpoint has no confirmed native mask parameter -- see section 6.

## 2. Files changed

```
NEW:
backend/app/services/inpainting/pollinations_provider.py   PollinationsProvider
backend/tests/test_pollinations_provider.py                 20 unit tests

MODIFIED:
backend/app/config.py                          pollinations_api_key, pollinations_image_model
backend/app/services/inpainting/factory.py     "pollinations" as a valid AI_PROVIDER value
backend/app/api/inpaint.py                     /ai/status reports "pollinations" + configured/model
backend/app/schemas/ai_status.py               provider type comment updated
backend/.env.example                           Pollinations variable names + setup notes
frontend/lib/ai/inpaintClient.ts               AiProviderStatus.provider type widened to include "pollinations"
frontend/components/editor/BackendStatusIndicator.tsx   generalized to any non-mock provider (see below)
```

**Correction, found during my own verification pass, not assumed away**: the
AI Edit job-submission flow itself genuinely needed no frontend changes, as
expected -- it already just POSTs to `/api/v1/inpaint` and polls the job,
correctly indifferent to which provider ends up running it. But the status
INDICATOR was a real, separate gap: it only special-cased `provider ===
"real"` (Replicate). Gemini and Pollinations both fell through to the
generic branch and silently displayed "Mock AI" even when genuinely
configured and active -- a real, pre-existing bug the Gemini integration
also should have caught and didn't. Generalized the check to treat any
non-mock provider consistently, and verified live: with
`AI_PROVIDER=pollinations` and a placeholder key configured, the header
correctly now shows "Pollinations" instead of the misleading "Mock AI".

## 3. Pollinations endpoint used

**Base URL**: `https://gen.pollinations.ai` (confirmed current -- this API
recently consolidated onto this host from an older multi-subdomain layout;
verified by fetching Pollinations' own APIDOCS.md directly rather than
assuming from training data, per this sprint's explicit instruction).

**Endpoint**: `POST /v1/images/edits` -- documented as "OpenAI-compatible,"
matching OpenAI's Images Edits API shape. Accepts `multipart/form-data`
with `image` (file), `prompt`, `model`.

**Auth**: `Authorization: Bearer <key>`, using a secret (`sk_...`) key --
Pollinations also offers publishable (`pk_...`) keys for browser use, which
this integration deliberately does NOT use, since the key must stay
server-side per this sprint's instruction.

## 4. Model tested (configuration, not live)

**Default**: `kontext` (Flux Kontext), configurable via
`ASTRA_POLLINATIONS_IMAGE_MODEL`. Chosen specifically because Pollinations'
docs list it among the models that accept reference images for
editing/style-guidance, and because Pollinations also offers `nanobanana`
(Gemini-based) -- using that would be redundant with the existing native
Gemini provider, so `kontext` is the more useful default alongside it.

Not hard-coded: `PollinationsProvider.__init__` reads the model from
settings, so changing `ASTRA_POLLINATIONS_IMAGE_MODEL` requires no code
change, verified by `test_pollinations_provider_uses_configured_model`.

## 5. Request/response flow

```
POST https://gen.pollinations.ai/v1/images/edits
Authorization: Bearer sk_...
Content-Type: multipart/form-data

  image=<base image bytes>
  image2=<mask bytes, ONLY if a mask was painted>
  prompt=<user's instruction, + mask guidance text appended if image2 is present>
  model=kontext
```

**Response parsing** (`_extract_image_bytes`): deliberately tolerant of
either `b64_json` (decoded directly) or `url` (fetched) in the response's
`data[0]` -- Pollinations documents both fields as valid for the sibling
`/v1/images/generations` endpoint's `CreateImageResponse` schema, and
`/v1/images/edits` returns "the same CreateImageResponse shape" per its own
docs, but the exact field `/edits` returns wasn't pinned to one example in
what was fetched. This mirrors the same defensive-parsing approach used for
Gemini, for the same reason: extra resilience specifically because it
couldn't be verified live.

## 6. Mask support status -- READ THIS BEFORE ASSUMING IT WORKS LIKE REPLICATE

**Not natively supported, and not faked.** Verified by directly inspecting
Pollinations' current API docs: `/v1/images/edits`'s documented fields are
`image`, `prompt`, `model` -- there is no `mask` parameter anywhere in the
current contract. This is architecturally an instruction + reference-image
editing model (similar to Gemini), not a true per-pixel-masked inpainting
model like Replicate's FLUX.1 Fill.

**What this implementation actually does when a mask is present**: sends
it as a second multipart image (`image2`) alongside explanatory text
appended to the prompt, asking the model to constrain the edit to the
white region -- the same best-effort-guidance pattern already used for
Gemini. This is explicitly a **guess at a reasonable mapping**, not a
confirmed-working mechanism: Pollinations' docs describe `kontext` and
similar models accepting *multiple reference images* for models that
support them, but never explain how a second image is interpreted (style
reference? spatial mask? ignored?). Until this is tested against the real
API, treat mask-guided Pollinations edits as unverified, not "supported."

Unmasked (instruction-only) requests are the well-documented, higher-
confidence path -- this matches the endpoint's actual documented contract
directly (`image` + `prompt` + `model`, no mask needed).

## 7. Known limitations

- **No live API verification** (section 1) -- the single most important
  open item, same as Gemini and Replicate before it. Needs a real
  `ASTRA_POLLINATIONS_API_KEY` to close.
- **Mask support is unverified guidance, not a confirmed mechanism**
  (section 6) -- stated plainly rather than glossed over, per this
  sprint's explicit instruction not to fake support.
- **Response shape assumption**: `_extract_image_bytes` handles both
  `b64_json` and `url` defensively since the exact field `/v1/images/edits`
  returns wasn't shown in a concrete example in the fetched docs (only
  `/v1/images/generations`'s example showed the full parameter table). If
  the real response differs from both handled shapes, this fails cleanly
  (a clear `InpaintingProviderError`), not silently.
- **Error message extraction** (`_extract_error_message`) assumes
  Pollinations' documented `{"error": {"message": ...}}` envelope; falls
  back to raw response text if that shape doesn't match, so a differently-
  shaped error still surfaces *something* useful rather than nothing.

## 8. Test results

**20 new unit tests, all passing** (`test_pollinations_provider.py`) --
mocked HTTP throughout, since no live credentials exist. Covers exactly
the 8 categories requested:

1. Initialization (with/without a key)
2. Missing API key -- raises cleanly, both at construction and via the factory
3. Configurable model -- verified the model sent in the request matches
   `ASTRA_POLLINATIONS_IMAGE_MODEL`, and that changing it requires no code change
4. Successful image-edit request -- verified the actual image bytes are in
   the multipart body (not just referenced), correct endpoint, correct auth
5. API failure handling -- 401, 402 (insufficient pollen balance), 429
   (rate limit), and network-level connection errors, each mapped to a
   clean `InpaintingProviderError`
6. Invalid/malformed response handling -- empty `data[]`, non-JSON body,
   missing image field
7. Provider selection through the existing factory -- selecting
   `pollinations` works, selecting it without a key raises
   `ProviderNotConfiguredError` (never silently falls back to mock),
   and -- critically -- selecting `gemini` still works unchanged
8. Current-image/prompt propagation -- two sequential calls with different
   images/prompts each send exactly their own data, proving the provider
   object caches nothing between calls (this is the check that would catch
   a regression of the earlier "second AI edit reuses the first prompt" bug
   class, applied to this new provider specifically)

**Full backend suite: 75/75 passing** (55 pre-existing + 20 new), confirming
Gemini, Replicate, mock, auth, and everything else remain unaffected.

**Live verification performed**: with a mock configuration (no real
Pollinations key), confirmed via real HTTP requests against the actual
running backend that (a) `/api/v1/ai/status` correctly reports
`provider: "pollinations", configured: false` when selected without a key,
and (b) submitting a real AI Edit job in that state fails cleanly through
the full job pipeline with an actionable error message -- never silently
substitutes the mock provider.

## 9. Integration-test instructions (once a real key is available)

```bash
# In backend/.env:
AI_PROVIDER=pollinations
ASTRA_POLLINATIONS_API_KEY=sk_your_real_secret_key

# Restart the backend, then confirm:
curl http://localhost:8000/api/v1/ai/status
# Expect: {"provider":"pollinations","configured":true,"model":"kontext",...}

# Then run the real acceptance scenarios directly against the running
# editor: an instruction-only edit (no mask) first, since that's the
# well-documented path; a mask-guided edit second, treating its result
# as an open question about whether the second-reference-image mapping
# in section 6 actually works as guidance.
```

No automated test in this repo makes a real network call to Pollinations --
consistent with the sprint's instruction to keep any real-API test separate
from normal unit tests, and none were added since no key exists to run them
against.
