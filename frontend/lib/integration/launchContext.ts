import type { AssetType } from "@/lib/types/asset";

/**
 * The contract by which a host application (5onam.ai) launches Astra
 * with a reference to an asset to edit, instead of the user uploading
 * a file locally.
 *
 * IMPORTANT: 5onam.ai's actual production contract has not been
 * provided yet. This is Astra's own integration-readiness abstraction
 * so the editor can accept an external asset reference today, and the
 * concrete field names/auth mechanism can change later without
 * touching the editor itself -- only parseLaunchContext() below.
 *
 * sessionToken is intentionally never logged or persisted anywhere;
 * treat it as opaque, short-lived, and sensitive.
 */
export interface AstraLaunchContext {
  assetId?: string;
  assetUrl?: string;
  assetType: AssetType;
  fileName?: string;
  /** Where Astra should send the user back to when they're done. */
  returnUrl?: string;
  /** Opaque token for a future authenticated asset-resolution request. Never log this. */
  sessionToken?: string;
}

const VALID_ASSET_TYPES: AssetType[] = ["image", "pdf", "pptx"];

/**
 * Parse a launch context from URL search params, e.g.:
 *   /editor?assetId=abc123&assetType=image
 *   /editor?assetUrl=https://.../file.png&assetType=image&returnUrl=...
 *
 * Returns null if no external launch parameters are present at all --
 * that's the normal "local upload" case, not an error.
 */
export function parseLaunchContext(params: URLSearchParams): AstraLaunchContext | null {
  const assetId = params.get("assetId") ?? undefined;
  const assetUrl = params.get("assetUrl") ?? undefined;

  if (!assetId && !assetUrl) return null;

  const rawType = params.get("assetType");
  const assetType: AssetType = VALID_ASSET_TYPES.includes(rawType as AssetType)
    ? (rawType as AssetType)
    : "image";

  return {
    assetId,
    assetUrl,
    assetType,
    fileName: params.get("fileName") ?? undefined,
    returnUrl: params.get("returnUrl") ?? undefined,
    sessionToken: params.get("sessionToken") ?? undefined,
  };
}

/** Build a launch URL for the mock dev entry point -- see /dev/launch-astra. */
export function buildLaunchUrl(base: string, context: Partial<AstraLaunchContext>): string {
  const url = new URL(base, typeof window !== "undefined" ? window.location.origin : "http://localhost:3000");
  Object.entries(context).forEach(([key, value]) => {
    if (value) url.searchParams.set(key, String(value));
  });
  return url.toString();
}
