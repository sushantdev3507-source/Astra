import { apiClient } from "@/lib/api/client";
import type { AssetType } from "@/lib/types/asset";

/**
 * Result of an Astra editing session. This is ASTRA'S OWN contract
 * (matches the backend's AstraEditResult model) -- not a 5onam.ai
 * production API. It exists so the editor has something concrete to
 * save to today, and so a future 5onam.ai return-flow integration has
 * a stable shape to build against once that contract is provided.
 */
export interface AstraEditResult {
  assetId: string;
  resultAssetId: string;
  assetType: AssetType;
  fileName: string;
  status: "saved" | "failed";
  url?: string;
}

/**
 * Save an exported canvas blob as the result of editing `assetId`.
 * Hits Astra's own backend (POST /api/v1/assets/{assetId}/result) --
 * NOT a 5onam.ai endpoint. See AstraEditResult docstring.
 */
export async function saveEditResult(
  assetId: string,
  blob: Blob,
  fileName: string
): Promise<AstraEditResult> {
  const formData = new FormData();
  formData.append("file", blob, fileName);
  return apiClient.postForm<AstraEditResult>(`/api/v1/assets/${assetId}/result`, formData);
}
