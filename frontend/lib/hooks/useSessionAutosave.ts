"use client";

import { useEffect, useRef } from "react";
import { useEditor } from "@/lib/editor/EditorProvider";
import { saveSession } from "@/lib/persistence/sessionStore";

const AUTOSAVE_DEBOUNCE_MS = 1200;

/**
 * Debounced autosave to IndexedDB (Sprint 3). Never writes on every
 * pointer movement -- only after the editor state settles for
 * AUTOSAVE_DEBOUNCE_MS. Best-effort: a failed write here never
 * interrupts editing (see sessionStore.ts).
 */
export function useSessionAutosave() {
  const { state } = useEditor();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!state.asset) return;
    // Don't autosave while a recovery is still pending application --
    // that would just write back the same (or a transitional) state.
    if (state.pendingRestoreDocument) return;

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      // Sync the current top-level mirror into a fresh copy of
      // pages[activePageId] before saving -- `state.pages` alone can
      // be one edit stale, since (by design, see reducer.ts) the
      // mirror is only written back into `pages` on a page switch, not
      // on every edit.
      const activePage = state.pages[state.activePageId];
      const pagesToSave = activePage
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

      saveSession({
        savedAt: Date.now(),
        assetId: state.asset!.id,
        assetName: state.asset!.name,
        assetUrl: state.asset!.url,
        document: state.canvas,
        pages: pagesToSave,
        pageOrder: state.pageOrder,
        activePageId: state.activePageId,
      });
    }, AUTOSAVE_DEBOUNCE_MS);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [state.asset, state.canvas, state.pendingRestoreDocument, state.pages, state.pageOrder, state.activePageId, state.history, state.historyIndex]);
}
