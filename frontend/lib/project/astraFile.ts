/**
 * The .astra project file format.
 *
 * REUSES the exact same shape as PersistedSession's multi-page fields
 * (see lib/persistence/sessionStore.ts) -- pages/pageOrder/activePageId,
 * mirroring PageRecord exactly -- rather than inventing a second
 * project format. The one addition here: every image reference
 * (each page's asset, and any AI-edited baseImageOverride) is embedded
 * as a base64 data: URI rather than a backend URL, so the file is
 * genuinely self-contained -- it must still open correctly on a
 * different machine, a different session, or after the original
 * backend upload no longer exists, none of which a bare URL reference
 * could survive.
 *
 * This also means Save (from the Export menu) makes NO backend
 * request of any kind -- everything needed already lives in the
 * browser's current state; this module just re-shapes it and embeds
 * image bytes.
 */
import type { PageRecord } from "@/lib/editor/types";
import type { EditorState } from "@/lib/editor/types";
import { getAssetFileUrl } from "@/lib/api/assets";

const ASTRA_FILE_FORMAT_VERSION = 1;

export interface AstraProjectFile {
  astraFileFormatVersion: number;
  savedAt: number;
  pages: Record<string, PageRecord>;
  pageOrder: string[];
  activePageId: string;
}

async function urlToDataUri(url: string): Promise<string> {
  if (url.startsWith("data:")) return url; // already embedded -- nothing to do
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Could not read image at ${url} (status ${resp.status}).`);
  const blob = await resp.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error("Could not read image data."));
    reader.readAsDataURL(blob);
  });
}

/**
 * Builds the full project file from current editor state, embedding
 * every image as a data URI. Mirrors useSessionAutosave.ts's own
 * "sync the live mirror into a fresh copy of pages[activePageId]"
 * step, since (by the reducer's own design) `state.pages` alone can
 * be one edit stale until an actual page switch writes the mirror
 * back -- see reducer.ts's syncMirrorIntoPages.
 */
export async function buildAstraProjectFile(state: EditorState): Promise<AstraProjectFile> {
  const activePage = state.pages[state.activePageId];
  const pagesWithFreshMirror: Record<string, PageRecord> = activePage
    ? {
        ...state.pages,
        [state.activePageId]: {
          ...activePage,
          asset: state.asset,
          canvas: state.canvas,
          history: state.history,
          historyIndex: state.historyIndex,
        },
      }
    : state.pages;

  const embeddedPages: Record<string, PageRecord> = {};
  for (const [id, page] of Object.entries(pagesWithFreshMirror)) {
    let embeddedAsset = page.asset;
    if (page.asset?.url) {
      const dataUri = await urlToDataUri(getAssetFileUrl(page.asset));
      embeddedAsset = { ...page.asset, url: dataUri };
    }
    let embeddedCanvas = page.canvas;
    if (page.canvas.baseImageOverride) {
      const dataUri = await urlToDataUri(page.canvas.baseImageOverride);
      embeddedCanvas = { ...page.canvas, baseImageOverride: dataUri };
    }
    embeddedPages[id] = { ...page, asset: embeddedAsset, canvas: embeddedCanvas };
  }

  return {
    astraFileFormatVersion: ASTRA_FILE_FORMAT_VERSION,
    savedAt: Date.now(),
    pages: embeddedPages,
    pageOrder: state.pageOrder,
    activePageId: state.activePageId,
  };
}

export async function serializeProjectToBlob(state: EditorState): Promise<Blob> {
  const project = await buildAstraProjectFile(state);
  return new Blob([JSON.stringify(project)], { type: "application/json" });
}

export class InvalidAstraFileError extends Error {}

/** Parses and minimally validates a .astra file's text content.
 * Deliberately permissive about the exact PageRecord shape inside
 * (that's the reducer's job to validate/tolerate, same as it already
 * does for IndexedDB-restored sessions) -- this only checks the
 * top-level shape needed to safely dispatch page/restoreAll. */
export function parseAstraProjectFile(fileText: string): AstraProjectFile {
  let parsed: unknown;
  try {
    parsed = JSON.parse(fileText);
  } catch {
    throw new InvalidAstraFileError("This file isn't valid JSON -- it may be corrupted or not a real .astra file.");
  }
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    !("pages" in parsed) ||
    !("pageOrder" in parsed) ||
    !("activePageId" in parsed)
  ) {
    throw new InvalidAstraFileError("This doesn't look like a valid Astra project file.");
  }
  return parsed as AstraProjectFile;
}
