/**
 * Generic asset abstraction.
 *
 * Astra will eventually support images, PDFs, and PPTX files, so this
 * type is intentionally NOT image-specific. Sprint 1 only produces
 * "image" assets, but every consumer of `Asset` should treat `type`
 * as meaningful rather than assuming it's always an image.
 */
export type AssetType = "image" | "pdf" | "pptx";

export interface Asset {
  id: string;
  type: AssetType;
  name: string;
  mimeType: string;
  url?: string;
  size?: number;
  width?: number;
  height?: number;
}

/**
 * How an asset can be handed to the editor. Local upload is the only
 * supported source in Sprint 1, but the shape already allows an asset
 * to be referenced by id/url so a future Sonamai integration can pass
 * `?assetId=` or `?assetUrl=` without reshaping the editor.
 */
export interface AssetReference {
  assetId?: string;
  assetUrl?: string;
  assetType?: AssetType;
}
