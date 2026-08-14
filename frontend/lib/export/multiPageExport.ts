/**
 * "All Pages" export and PDF generation for the Export menu.
 *
 * IMPORTANT, HONEST LIMITATION: the live CanvasEngine only ever holds
 * ONE page's state at a time (see reducer.ts's design -- top-level
 * asset/canvas fields mirror whichever page is active). There is no
 * offscreen/headless renderer that can produce another page's output
 * without the live engine briefly loading it. So "export all pages"
 * works by actually switching through each page via the SAME
 * page/switchTo action the page tabs use, capturing that page's
 * export blob, then switching back to whichever page was active
 * before the export started. This means:
 *   - The user will briefly SEE the canvas flicker through each page
 *     during an All Pages export -- not invisible/background work.
 *   - Correctness depends on waiting long enough after each switch
 *     for the engine to finish loading that page's image before
 *     capturing it. There's no direct "page fully loaded" signal
 *     exposed to this module, so this polls the engine's own
 *     reported document dimensions against the target page's known
 *     dimensions, with a timeout fallback -- reasonably reliable for
 *     the local/data-URI image loads this app deals with, but not a
 *     hard guarantee under all conditions.
 */
import jsPDF from "jspdf";
import type { CanvasEngine } from "@/lib/canvas-engine";
import type { EditorAction } from "@/lib/editor/reducer";
import type { EditorState } from "@/lib/editor/types";

type ImageFormat = "image/png" | "image/jpeg" | "image/webp";

async function waitForPageToLoad(
  engine: CanvasEngine,
  expectedWidth: number,
  expectedHeight: number,
  timeoutMs = 4000
): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const doc = engine.getState();
    if (doc.sourceWidth === expectedWidth && doc.sourceHeight === expectedHeight) return;
    await new Promise((r) => setTimeout(r, 60));
  }
  // Timed out -- proceed anyway rather than hang the export forever;
  // whatever's currently loaded gets captured, which in the worst
  // case (a very slow image load) means one page's export could be
  // wrong. Rare in practice for local/data-URI sources.
}

/**
 * Switches through every page, capturing each as a blob, then
 * restores whichever page was originally active. Returns blobs in
 * pageOrder, each paired with its page's display name (used for
 * PDF page labeling / individual file naming).
 */
export async function captureAllPagesAsBlobs(
  state: EditorState,
  engine: CanvasEngine,
  dispatch: (action: EditorAction) => void,
  format: ImageFormat
): Promise<{ name: string; blob: Blob; width: number; height: number }[]> {
  const originalPageId = state.activePageId;
  const results: { name: string; blob: Blob; width: number; height: number }[] = [];

  // Same "sync the live mirror into pages[activePageId]" step used by
  // buildAstraProjectFile()/useSessionAutosave.ts -- state.pages alone
  // can be one edit stale for whichever page is CURRENTLY active,
  // since (by the reducer's design) the mirror only gets written back
  // into `pages` on an actual page switch, not continuously.
  const activePageRecord = state.pages[state.activePageId];
  const pages = activePageRecord
    ? {
        ...state.pages,
        [state.activePageId]: {
          ...activePageRecord,
          asset: state.asset,
          canvas: state.canvas,
          history: state.history,
          historyIndex: state.historyIndex,
        },
      }
    : state.pages;

  for (const pageId of state.pageOrder) {
    const page = pages[pageId];
    if (!page) continue;

    dispatch({ type: "page/switchTo", pageId });
    if (page.asset) {
      await waitForPageToLoad(engine, page.canvas.sourceWidth, page.canvas.sourceHeight);
    }
    // Give one extra frame for the drawing-layer/objects paint pass
    // that follows the base image load (see engine.ts's render pipeline notes).
    await new Promise((r) => requestAnimationFrame(() => r(null)));

    const blob = page.asset ? await engine.exportToBlob(format) : await blankPageBlob(page, format);
    // Return the ALREADY-correctly-synced dimensions from this
    // function's own `pages` (see above) -- the caller must NOT
    // re-derive these from the raw `state` it was given, since that
    // can be stale for whichever page was most recently edited
    // without a subsequent page-switch (this was a real bug, caught
    // via live QA: a freshly-uploaded second page's PDF export was
    // sized using its stale pre-upload placeholder dimensions).
    results.push({ name: page.name, blob, width: page.canvas.sourceWidth, height: page.canvas.sourceHeight });
  }

  dispatch({ type: "page/switchTo", pageId: originalPageId });
  return results;
}

/** A page with no asset (never had an image uploaded/templated onto
 * it) has nothing for the live engine to export -- produce a blank
 * canvas at that page's own recorded dimensions instead of skipping
 * it silently, so "All Pages" never produces fewer pages than exist. */
async function blankPageBlob(page: { canvas: { sourceWidth: number; sourceHeight: number } }, format: ImageFormat): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = page.canvas.sourceWidth || 1;
  canvas.height = page.canvas.sourceHeight || 1;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not create blank page."))), format);
  });
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error("Could not read image."));
    reader.readAsDataURL(blob);
  });
}

/** Builds a PDF from one or more page images, one PDF page per image,
 * each PDF page sized to match that image's own pixel dimensions
 * (converted to points at 96 DPI) rather than forcing every page onto
 * a fixed Letter/A4 size regardless of the project's actual canvas
 * dimensions. */
export async function buildPdfBlob(pages: { blob: Blob; width: number; height: number }[]): Promise<Blob> {
  if (pages.length === 0) throw new Error("No pages to export.");
  const PT_PER_PX = 72 / 96;

  const first = pages[0];
  const pdf = new jsPDF({
    orientation: first.width >= first.height ? "landscape" : "portrait",
    unit: "pt",
    format: [first.width * PT_PER_PX, first.height * PT_PER_PX],
  });

  for (let i = 0; i < pages.length; i++) {
    const p = pages[i];
    if (i > 0) {
      pdf.addPage([p.width * PT_PER_PX, p.height * PT_PER_PX], p.width >= p.height ? "landscape" : "portrait");
    }
    const dataUrl = await blobToDataUrl(p.blob);
    const format = p.blob.type.includes("jpeg") ? "JPEG" : p.blob.type.includes("webp") ? "WEBP" : "PNG";
    pdf.addImage(dataUrl, format, 0, 0, p.width * PT_PER_PX, p.height * PT_PER_PX);
  }

  return pdf.output("blob");
}
