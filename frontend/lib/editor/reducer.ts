import type { Asset } from "@/lib/types/asset";
import { CanvasSnapshot, createBlankPage, EditorState, PageRecord, ToolId } from "./types";

const MAX_HISTORY = 50;

export type EditorAction =
  | { type: "asset/set"; asset: Asset; restoreDocument?: CanvasSnapshot }
  | { type: "asset/clear" }
  | { type: "tool/set"; tool: ToolId }
  | { type: "selection/set"; selection: string | null }
  | { type: "upload/start" }
  | { type: "upload/error"; message: string }
  | { type: "backend/status"; online: boolean }
  /**
   * Generic history commit. ANY future editing operation (draw stroke,
   * text insert, crop, shape add, ...) should dispatch this with the
   * resulting snapshot rather than adding a bespoke action + reducer
   * case. This is what keeps undo/redo from becoming a pile of
   * unrelated special cases.
   */
  | { type: "canvas/commit"; snapshot: CanvasSnapshot }
  | { type: "canvas/setZoom"; zoom: number }
  | { type: "canvas/resetView" }
  /**
   * Dispatched once, right after the engine finishes loading a newly
   * set asset's image and produces its real initial document (correct
   * source dimensions). Resets history to a single starting snapshot,
   * as opposed to canvas/commit which appends.
   */
  | { type: "canvas/init"; snapshot: CanvasSnapshot }
  | { type: "session/consumeRestore" }
  | { type: "color/picked"; hex: string }
  | { type: "history/undo" }
  | { type: "history/redo" }
  // --- Multi-page (Sprint 5 foundation) ---
  | { type: "page/create" }
  | { type: "page/switchTo"; pageId: string }
  | { type: "page/delete"; pageId: string }
  | { type: "page/duplicate"; pageId: string }
  | { type: "page/rename"; pageId: string; name: string }
  | { type: "page/reorder"; pageId: string; toIndex: number }
  | {
      type: "page/restoreAll";
      pages: Record<string, PageRecord>;
      pageOrder: string[];
      activePageId: string;
    };

function commitSnapshot(state: EditorState, snapshot: CanvasSnapshot): EditorState {
  // Discard any "future" history beyond the current pointer, then push.
  const truncated = state.history.slice(0, state.historyIndex + 1);
  const nextHistory = [...truncated, snapshot].slice(-MAX_HISTORY);
  return {
    ...state,
    canvas: snapshot,
    history: nextHistory,
    historyIndex: nextHistory.length - 1,
  };
}

/** Saves the current top-level mirror (asset/canvas/history/historyIndex)
 * into pages[activePageId], returning the updated pages record. */
function syncMirrorIntoPages(state: EditorState): Record<string, PageRecord> {
  const current = state.pages[state.activePageId];
  if (!current) return state.pages;
  return {
    ...state.pages,
    [state.activePageId]: {
      ...current,
      asset: state.asset,
      canvas: state.canvas,
      history: state.history,
      historyIndex: state.historyIndex,
    },
  };
}

/** Loads a page's saved state into the top-level mirror fields.
 * Sets pendingRestoreDocument so Canvas.tsx applies the page's actual
 * saved content via the SAME restore path already built and tested
 * for IndexedDB session recovery, rather than a second mechanism --
 * see Canvas.tsx's load-image effect. */
function loadPageIntoMirror(state: EditorState, page: PageRecord): EditorState {
  return {
    ...state,
    asset: page.asset,
    canvas: page.canvas,
    history: page.history,
    historyIndex: page.historyIndex,
    selection: null,
    activeTool: "select",
    uploadError: null,
    isUploading: false,
    pendingRestoreDocument: page.asset ? page.canvas : null,
  };
}

let pageIdCounter = 0;
function generatePageId(): string {
  pageIdCounter += 1;
  return `page_${Date.now().toString(36)}_${pageIdCounter}`;
}

export function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case "asset/set": {
      // Canvas/history reset happens via canvas/init once the engine
      // finishes loading the image and knows its real dimensions --
      // UNLESS a restoreDocument is provided (IndexedDB session
      // recovery), in which case history is set directly here so
      // Canvas.tsx's restore path (see loadKey effect) has a correct
      // historyIndex to preserve instead of collapsing to 0.
      const restoreDoc = action.restoreDocument;
      return {
        ...state,
        asset: action.asset,
        isUploading: false,
        uploadError: null,
        selection: null,
        pendingRestoreDocument: restoreDoc ?? null,
        ...(restoreDoc ? { canvas: restoreDoc, history: [restoreDoc], historyIndex: 0 } : {}),
      };
    }

    case "canvas/init": {
      const snapshot = action.snapshot;
      return {
        ...state,
        canvas: snapshot,
        history: [snapshot],
        historyIndex: 0,
      };
    }

    case "session/consumeRestore":
      return { ...state, pendingRestoreDocument: null };

    case "color/picked":
      return { ...state, lastPickedColor: action.hex, activeTool: "select" };

    case "asset/clear":
      return {
        ...state,
        asset: null,
        selection: null,
        activeTool: "select",
        uploadError: null,
        isUploading: false,
        pendingRestoreDocument: null,
      };

    case "tool/set":
      return { ...state, activeTool: action.tool };

    case "selection/set":
      return { ...state, selection: action.selection };

    case "upload/start":
      return { ...state, isUploading: true, uploadError: null };

    case "upload/error":
      return { ...state, isUploading: false, uploadError: action.message };

    case "backend/status":
      return { ...state, backendOnline: action.online };

    case "canvas/commit":
      return commitSnapshot(state, action.snapshot);

    case "canvas/setZoom":
      return commitSnapshot(state, { ...state.canvas, zoom: action.zoom });

    case "canvas/resetView":
      return commitSnapshot(state, { ...state.canvas, zoom: 1 });

    case "history/undo": {
      if (state.historyIndex <= 0) return state;
      const nextIndex = state.historyIndex - 1;
      return { ...state, historyIndex: nextIndex, canvas: state.history[nextIndex] };
    }

    case "history/redo": {
      if (state.historyIndex >= state.history.length - 1) return state;
      const nextIndex = state.historyIndex + 1;
      return { ...state, historyIndex: nextIndex, canvas: state.history[nextIndex] };
    }

    // --- Multi-page (Sprint 5 foundation) ---
    // See the EditorState.pages doc comment in types.ts: asset/canvas/
    // history/historyIndex always mirror pages[activePageId]. These
    // cases are the ONLY place that ever reads/writes `pages` directly.

    case "page/create": {
      const id = generatePageId();
      const pageNumber = state.pageOrder.length + 1;
      const newPage = createBlankPage(id, `Page ${pageNumber}`);
      const syncedPages = syncMirrorIntoPages(state);
      const withNewPage = { ...syncedPages, [id]: newPage };
      return loadPageIntoMirror(
        { ...state, pages: withNewPage, pageOrder: [...state.pageOrder, id], activePageId: id },
        newPage
      );
    }

    case "page/switchTo": {
      if (action.pageId === state.activePageId) return state;
      const syncedPages = syncMirrorIntoPages(state);
      const target = syncedPages[action.pageId];
      if (!target) return state;
      return loadPageIntoMirror({ ...state, pages: syncedPages, activePageId: action.pageId }, target);
    }

    case "page/delete": {
      if (state.pageOrder.length <= 1) return state; // always keep at least one page
      const deletingActive = action.pageId === state.activePageId;
      const remainingOrder = state.pageOrder.filter((id) => id !== action.pageId);
      const remainingPages = { ...state.pages };
      delete remainingPages[action.pageId];

      if (!deletingActive) {
        return { ...state, pages: remainingPages, pageOrder: remainingOrder };
      }
      // Deleting the active page: switch to the next page (or the previous
      // one if the deleted page was last) BEFORE removing it, using the
      // already-current mirror (no need to sync it -- it's being discarded).
      const deletedIndex = state.pageOrder.indexOf(action.pageId);
      const fallbackId = remainingOrder[Math.min(deletedIndex, remainingOrder.length - 1)];
      const fallbackPage = remainingPages[fallbackId];
      return loadPageIntoMirror(
        { ...state, pages: remainingPages, pageOrder: remainingOrder, activePageId: fallbackId },
        fallbackPage
      );
    }

    case "page/duplicate": {
      const syncedPages = syncMirrorIntoPages(state); // ensure source page (if active) is up to date
      const source = syncedPages[action.pageId];
      if (!source) return state;
      const id = generatePageId();
      const copy: PageRecord = {
        ...source,
        id,
        name: `${source.name} copy`,
      };
      const sourceIndex = state.pageOrder.indexOf(action.pageId);
      const nextOrder = [...state.pageOrder];
      nextOrder.splice(sourceIndex + 1, 0, id);
      // Duplicate does NOT switch the active page -- the user stays where they are.
      return { ...state, pages: { ...syncedPages, [id]: copy }, pageOrder: nextOrder };
    }

    case "page/rename": {
      const page = state.pages[action.pageId];
      if (!page) return state;
      return { ...state, pages: { ...state.pages, [action.pageId]: { ...page, name: action.name } } };
    }

    case "page/reorder": {
      const fromIndex = state.pageOrder.indexOf(action.pageId);
      if (fromIndex === -1) return state;
      const nextOrder = [...state.pageOrder];
      nextOrder.splice(fromIndex, 1);
      nextOrder.splice(Math.max(0, Math.min(action.toIndex, nextOrder.length)), 0, action.pageId);
      return { ...state, pageOrder: nextOrder };
    }

    case "page/restoreAll":
      return loadPageIntoMirror(
        { ...state, pages: action.pages, pageOrder: action.pageOrder, activePageId: action.activePageId },
        action.pages[action.activePageId]
      );

    default:
      return state;
  }
}
