"""
Deterministic mock inpainting provider.

No real AI model is called here -- there is no credential to invent
and none is used. This exists so the full AI Edit pipeline (mask
painting -> extraction -> API -> result -> undo/redo) can be built,
tested, and demoed end-to-end before a real provider is wired in.

The mock picks one of several CLEARLY DIFFERENT visual treatments
based on simple keyword matching against the prompt. Only inside the
masked region; composited back using the (feathered) mask as an alpha
blend. A small unobtrusive watermark marks the output as
mock-generated so it's never mistaken for a real model result during
review/QA.

IMPORTANT (post-Sprint-3 bugfix, round 2): the original "generic"
fallback category -- used for any prompt not matching an explicit
keyword list -- applied a hue-shift + saturation boost, which is
visually indistinguishable from the "color" category. Since most
natural-language prompts don't literally contain the word "color",
almost every real prompt fell into that fallback and LOOKED like a
recolor no matter what was actually typed -- this was reported (and
looked, reasonably, exactly like) "AI Edit always just changes
colors regardless of the prompt." The generic fallback below now uses
NO hue rotation and NO saturation boost at all -- a posterize +
contour/graphic treatment instead -- so it can never be confused with
the color category. Two more explicit categories (addition, style)
were also added to shrink how often prompts land in the fallback at
all.
"""
from __future__ import annotations

import hashlib
import io
import time
from typing import Optional

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageOps

from app.services.inpainting.base import InpaintingProvider, InpaintingProviderError, InpaintResult

_REMOVAL_KEYWORDS = ("remove", "delete", "erase", "get rid of", "clear away", "take out", "take away")
_ENHANCE_KEYWORDS = ("enhance", "sharpen", "brighten", "improve", "clarity", "clearer", "crisp")
_COLOR_KEYWORDS = ("colour", "color", "recolor", "recolour", "hue", "tint", "paint it", "dye")
_ADDITION_KEYWORDS = ("add", "draw", "put", "place", "insert", "give it", "attach")
_STYLE_KEYWORDS = ("style", "artistic", "sketch", "painting", "cartoon", "look like", "turn into", "make it")

# Named colors the "color" category actually recognizes and targets
# directly, rather than falling back to an arbitrary hash-derived hue.
# (RGB, used as a direct tint target -- see _apply_color_style.)
_NAMED_COLORS: dict[str, tuple[int, int, int]] = {
    "black": (20, 20, 20),
    "white": (235, 235, 235),
    "red": (200, 40, 40),
    "orange": (230, 130, 30),
    "yellow": (225, 200, 40),
    "green": (50, 160, 70),
    "blue": (40, 90, 200),
    "purple": (130, 60, 180),
    "violet": (150, 70, 190),
    "pink": (230, 110, 160),
    "brown": (120, 80, 50),
    "gray": (130, 130, 130),
    "grey": (130, 130, 130),
    "gold": (200, 170, 60),
    "silver": (180, 180, 190),
    "navy": (30, 45, 90),
    "teal": (30, 140, 140),
    "cyan": (60, 190, 210),
    "magenta": (190, 50, 160),
    "maroon": (110, 30, 40),
    "turquoise": (50, 180, 170),
}


def _find_named_color(prompt: str) -> tuple[int, int, int] | None:
    lowered = prompt.lower()
    for name, rgb in _NAMED_COLORS.items():
        if name in lowered:
            return rgb
    return None


def _prompt_hash_int(prompt: str) -> int:
    digest = hashlib.sha256(prompt.encode("utf-8")).hexdigest()
    return int(digest[:8], 16)


def _rotate_hue(image: Image.Image, degrees: int) -> Image.Image:
    hsv = image.convert("HSV")
    h, s, v = hsv.split()
    h = h.point(lambda p: (p + int(degrees / 360 * 255)) % 255)
    return Image.merge("HSV", (h, s, v)).convert("RGB")


def _classify_prompt(prompt: str) -> str:
    lowered = prompt.lower()

    # Strong, deliberate action verbs win even if a color is also
    # mentioned incidentally (e.g. "remove the red car" must stay
    # "removal", not get hijacked into "color" just because "red"
    # appears in the sentence).
    if any(kw in lowered for kw in _REMOVAL_KEYWORDS):
        return "removal"
    if any(kw in lowered for kw in _ENHANCE_KEYWORDS):
        return "enhance"

    # An explicit, unambiguous color name ("make it blue", "turn this
    # red", "color it black") is a strong enough signal to win over
    # incidental phrase matches from the weaker categories below (e.g.
    # "make it" matching the style category) -- checked before them.
    if _find_named_color(prompt) is not None:
        return "color"

    if any(kw in lowered for kw in _COLOR_KEYWORDS):
        return "color"
    if any(kw in lowered for kw in _ADDITION_KEYWORDS):
        return "addition"
    if any(kw in lowered for kw in _STYLE_KEYWORDS):
        return "style"
    return "generic"


def _apply_removal_style(region: Image.Image) -> Image.Image:
    """Simulates 'taking something out': desaturate + heavy blur, so the
    masked area reads as smoothed-over/emptied rather than recolored."""
    out = region.convert("L").convert("RGB")
    return out.filter(ImageFilter.GaussianBlur(radius=6))


def _apply_enhance_style(region: Image.Image) -> Image.Image:
    """No hue/saturation change at all -- purely sharpness/contrast, so
    it can't be confused with the color category."""
    out = ImageEnhance.Sharpness(region).enhance(2.4)
    out = ImageEnhance.Contrast(out).enhance(1.3)
    return ImageEnhance.Brightness(out).enhance(1.1)


def _apply_color_style(region: Image.Image, prompt: str) -> Image.Image:
    named = _find_named_color(prompt)
    if named is not None:
        # A specific color WAS named in the prompt ("make it black",
        # "turn it blue") -- tint directly toward that exact color
        # rather than an arbitrary hash-derived hue, so the result
        # actually reflects what was asked for. Blends with the
        # original luminance so texture/shading isn't fully flattened.
        target = Image.new("RGB", region.size, named)
        return Image.blend(region, target, 0.85)

    # No specific color named ("change the colours", "recolor this") --
    # deterministic-but-arbitrary hue shift is the correct fallback here.
    hue_shift = _prompt_hash_int(prompt) % 360
    out = _rotate_hue(region, hue_shift)
    out = ImageEnhance.Color(out).enhance(1.6)
    return out.filter(ImageFilter.GaussianBlur(radius=1))


def _apply_addition_style(region: Image.Image, prompt: str) -> Image.Image:
    """Simulates 'something new was added': an edge/emboss overlay
    blended on top, suggesting new structure/content rather than a
    color or removal change. No hue rotation."""
    edges = region.filter(ImageFilter.FIND_EDGES).convert("L")
    edges = ImageOps.autocontrast(edges)
    edges_rgb = Image.merge("RGB", (edges, edges, edges))
    seed = _prompt_hash_int(prompt) % 30 + 20  # 20-50% blend, varies per prompt
    return Image.blend(region, edges_rgb, seed / 100)


def _apply_style_style(region: Image.Image, prompt: str) -> Image.Image:
    """Simulates a stylistic/artistic transform: posterize + edge
    enhance. No hue rotation, no saturation boost -- reads as
    'graphic/illustrated', not 'recolored'."""
    bits = 2 + (_prompt_hash_int(prompt) % 3)  # 2-4 bits -> varies posterize strength
    out = ImageOps.posterize(region, bits)
    return out.filter(ImageFilter.EDGE_ENHANCE_MORE)


def _apply_generic_style(region: Image.Image, prompt: str) -> Image.Image:
    """Fallback for prompts matching no explicit category. Deliberately
    uses NO hue rotation and NO saturation boost -- see module
    docstring for why that distinction matters."""
    bits = 3 + (_prompt_hash_int(prompt) % 3)  # 3-5 bits
    out = ImageOps.posterize(region, bits)
    out = out.filter(ImageFilter.CONTOUR)
    return ImageEnhance.Contrast(out).enhance(1.15)


class MockInpaintingProvider(InpaintingProvider):
    name = "mock"

    async def inpaint(self, image_bytes: bytes, mask_bytes: Optional[bytes], prompt: str) -> InpaintResult:
        start = time.monotonic()
        try:
            base = Image.open(io.BytesIO(image_bytes)).convert("RGB")
            if mask_bytes is not None:
                mask = Image.open(io.BytesIO(mask_bytes)).convert("L")
                if mask.size != base.size:
                    mask = mask.resize(base.size)
            else:
                # No mask -- maskless/instruction-only edit (mirrors
                # Gemini's supported mode). Apply the effect to the
                # WHOLE image: an all-white mask.
                mask = Image.new("L", base.size, 255)

            effective_prompt = prompt or "edit"
            category = _classify_prompt(effective_prompt)

            if category == "removal":
                transformed = _apply_removal_style(base)
            elif category == "enhance":
                transformed = _apply_enhance_style(base)
            elif category == "color":
                transformed = _apply_color_style(base, effective_prompt)
            elif category == "addition":
                transformed = _apply_addition_style(base, effective_prompt)
            elif category == "style":
                transformed = _apply_style_style(base, effective_prompt)
            else:
                transformed = _apply_generic_style(base, effective_prompt)

            result = Image.composite(transformed, base, mask)

            # Small, unobtrusive corner watermark -- never mistake mock
            # output for a real model result during review.
            draw = ImageDraw.Draw(result, "RGBA")
            label = f"ASTRA MOCK AI ({category})"
            padding = 6
            text_w = draw.textlength(label)
            box = (0, 0, text_w + padding * 2, 18)
            draw.rectangle(box, fill=(0, 0, 0, 140))
            draw.text((padding, 3), label, fill=(255, 255, 255, 230))

            out = io.BytesIO()
            result.save(out, format="PNG")
            latency_ms = int((time.monotonic() - start) * 1000)
            return InpaintResult(image_bytes=out.getvalue(), provider_name=self.name, latency_ms=latency_ms)
        except Exception as exc:  # noqa: BLE001 - convert any failure into a clean provider error
            raise InpaintingProviderError("Mock inpainting provider failed to process the request.") from exc
