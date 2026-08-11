import type { Asset } from "@/lib/types/asset";
import { getAssetById } from "@/lib/api/assets";
import type { AstraLaunchContext } from "./launchContext";

/**
 * Turn an AstraLaunchContext (an external asset reference from a host
 * app like 5onam.ai) into a concrete Asset the editor can load.
 *
 * Two supported shapes today:
 *  - assetId: resolved against Astra's own backend (the asset must
 *    already exist there -- e.g. previously uploaded through Astra).
 *  - assetUrl: used directly. Astra does not assume this is a public
 *    URL forever; once 5onam.ai's real contract exists, this is the
 *    place a signed/authenticated fetch would be added.
 *
 * sessionToken is accepted but intentionally unused/unlogged in
 * Sprint 2 -- see launchContext.ts.
 */
export async function resolveLaunchAsset(context: AstraLaunchContext): Promise<Asset> {
  if (context.assetId) {
    return getAssetById(context.assetId);
  }

  if (context.assetUrl) {
    return {
      id: `external_${Date.now()}`,
      type: context.assetType,
      name: context.fileName ?? "external-asset",
      mimeType: guessMimeType(context.assetType),
      url: context.assetUrl,
    };
  }

  throw new Error("Launch context has neither assetId nor assetUrl.");
}

function guessMimeType(type: AstraLaunchContext["assetType"]): string {
  switch (type) {
    case "image":
      return "image/png";
    case "pdf":
      return "application/pdf";
    case "pptx":
      return "application/vnd.openxmlformats-officedocument.presentationml.presentation";
    default:
      return "application/octet-stream";
  }
}
