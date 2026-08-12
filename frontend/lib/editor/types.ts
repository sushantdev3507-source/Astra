import type { Asset } from "@/lib/types/asset";
import { createEmptyDocument, type EditorDocument, type ToolId } from "@/lib/canvas-engine";

export type { ToolId } from "@/lib/canvas-engine";

export interface ToolDefinition {
  id: ToolId;
  label: string;
  /** Placeholder tools have UI but no engine implementation yet. */
  isPlaceholder: boolean;
  /** AI Edit is disabled entirely until AI providers land in a later sprint. */
  isDisabled?: boolean;
}

export const TOOLS: ToolDefinition[] = [
  { id: "select", label: "Select", isPlaceholder: false },
  { id: "draw", label: "Draw", isPlaceholder: false },
  { id: "eraser", label: "Eraser", isPlaceholder: false },
  { id: "text", label: "Text", isPlaceholder: false },
  { id: "shape", label: "Shape", isPlaceholder: false },
  { id: "crop", label: "Crop", isPlaceholder: false },
  { id: "eyedropper", label: "Eyedropper", isPlaceholder: false },
  { id: "ai-edit", label: "AI Edit", isPlaceholder: false },
];

/**
 * A snapshot of everything about the canvas that undo/redo can restore.
 * As of Sprint 2 this IS the html-tool engine's serializable
 * EditorDocument (zoom, crop, drawing layer, objects) -- the reducer
 * below stays generic and doesn't need to know what's inside it.
 */
export type CanvasSnapshot = EditorDocument;

/**
 * One page in a multi-page Astra project (foundation for future
 * PDF/PPTX support -- each PDF page or PPTX slide maps to one
 * PageRecord). Each page owns a fully independent asset (background),
 * object/drawing state, and undo/redo history -- switching pages never
 * mixes one page's history with another's.
 */
export interface PageRecord {
  id: string;
  name: string;
  asset: Asset | null;
  canvas: CanvasSnapshot;
  history: CanvasSnapshot[];
  historyIndex: number;
}

export function createBlankPage(id: string, name: string): PageRecord {
  const blank = createEmptyDocument(1, 1);
  return { id, name, asset: null, canvas: blank, history: [blank], historyIndex: 0 };
}

export interface EditorState {
  asset: Asset | null;
  activeTool: ToolId;
  selection: string | null;

  canvas: CanvasSnapshot;
  history: CanvasSnapshot[];
  historyIndex: number; // index into `history` representing the current snapshot

  isUploading: boolean;
  uploadError: string | null;
  backendOnline: boolean | null; // null = unknown/checking

  /**
   * Set when a recovered IndexedDB session should be applied to the
   * engine as soon as its image finishes loading (Sprint 3). Canvas.tsx
   * consumes this once and clears it -- see session/consumeRestore.
   */
  pendingRestoreDocument: CanvasSnapshot | null;

  /** Hex color from the most recent Eyedropper pick -- Toolbar applies
   * it to whichever color field is contextually relevant. */
  lastPickedColor: string | null;

  /**
   * Multi-page project state (Sprint 5 foundation). `asset`/`canvas`/
   * `history`/`historyIndex` above always mirror `pages[activePageId]`
   * -- this is deliberate: every existing component (Canvas, Toolbar,
   * StatusBar, PropertiesPanel, LayersPanel) keeps reading/writing
   * those top-level fields completely unchanged, with zero awareness
   * that pages exist. Only page-switching actions (page/create,
   * page/switchTo, page/delete, page/duplicate) touch `pages` directly
   * -- they save the current mirror into the outgoing page and load
   * the incoming page's saved state into the mirror. This avoids a
   * second, competing history system: each page's undo/redo stack is
   * just its own independent copy of the exact same history shape
   * every page already used before multi-page existed.
   */
  pages: Record<string, PageRecord>;
  pageOrder: string[];
  activePageId: string;
}

export const INITIAL_CANVAS: CanvasSnapshot = createEmptyDocument(1, 1);

const INITIAL_PAGE_ID = "page_1";

export const initialEditorState: EditorState = {
  asset: null,
  activeTool: "select",
  selection: null,
  canvas: INITIAL_CANVAS,
  history: [INITIAL_CANVAS],
  historyIndex: 0,
  isUploading: false,
  uploadError: null,
  backendOnline: null,
  pendingRestoreDocument: null,
  lastPickedColor: null,
  pages: { [INITIAL_PAGE_ID]: createBlankPage(INITIAL_PAGE_ID, "Page 1") },
  pageOrder: [INITIAL_PAGE_ID],
  activePageId: INITIAL_PAGE_ID,
};
