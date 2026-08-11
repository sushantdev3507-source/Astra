import { apiClient, getApiBaseUrl } from "./client";
import type { Asset } from "@/lib/types/asset";

interface AssetUploadResponse {
  success: boolean;
  asset?: Asset;
  error?: string;
}

interface AssetMetadataResponse {
  success: boolean;
  asset?: Asset;
  error?: string;
}

/**
 * Upload a local file to the backend and return the resulting Asset.
 * Future asset sources (images.ts, pdf.ts, ppt.ts, ai.ts) can live
 * alongside this file without touching callers.
 */
export async function uploadAsset(file: File): Promise<Asset> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await apiClient.postForm<AssetUploadResponse>("/api/v1/assets/upload", formData);

  if (!response.success || !response.asset) {
    throw new Error(response.error ?? "Upload failed.");
  }
  return response.asset;
}

/**
 * Look up a previously uploaded asset's metadata by id, without
 * re-uploading. Used to resolve an external (5onam.ai) launch that
 * references an assetId.
 */
export async function getAssetById(assetId: string): Promise<Asset> {
  const response = await apiClient.get<AssetMetadataResponse>(`/api/v1/assets/${assetId}`);
  if (!response.success || !response.asset) {
    throw new Error(response.error ?? "Asset not found.");
  }
  return response.asset;
}

/** Resolve a full, fetchable URL for an asset returned by the backend. */
export function getAssetFileUrl(asset: Asset): string {
  if (!asset.url) return "";
  if (asset.url.startsWith("http")) return asset.url;
  return `${getApiBaseUrl()}${asset.url}`;
}
