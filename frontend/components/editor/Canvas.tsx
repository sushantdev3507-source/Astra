"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useEditor } from "@/lib/editor/EditorProvider";
import { useCanvasEngine } from "@/lib/editor/EngineContext";
import { getAssetFileUrl } from "@/lib/api/assets";
import { CanvasEngine } from "@/lib/canvas-engine";
import { decideHistorySync, type HistorySyncState } from "@/lib/editor/historySync";
import { useAiEditContext } from "@/lib/editor/AiEditContext";
import { UploadDropzone } from "./UploadDropzone";

export function Canvas() {
  const { state, dispatch } = useEditor();
  const engineRef = useCanvasEngine();
  const aiEdit = useAiEditContext();
  const canvasElRef = useRef<HTMLCanvasElement | null>(null);
  const loadedAssetIdRef = useRef<string | null>(null);
  const lastSyncedHistoryIndexRef = useRef<number>(-1);
  // Set to true the instant the ENGINE's own onCommit fires. The
  // actual skip/restore decision is made by decideHistorySync() (a
  // pure, independently-tested function) so this file stays a thin
  // wrapper around logic that's verified without any DOM/canvas.
  const selfCommitPendingRef = useRef(false);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const textEditorRef = useRef<HTMLTextAreaElement | null>(null);
  const suppressNextBlurRef = useRef(false);
  const [showColorToast, setShowColorToast] = useState(false);

  // Eyedropper picks are otherwise silent -- the tool auto-returns to
  // Select right after sampling, with no other visible confirmation
  // that anything happened (this was reported as "eyedropper does
  // nothing" -- it DOES work, it just gave no feedback). A brief toast
  // showing the picked swatch + hex closes that gap. Shown-state is
  // tracked via a comparison STATE value updated during render (not a
  // ref -- this project's lint config disallows ref reads during
  // render, same as the Toolbar's eyedropper-consumption fix), so the
  // effect below only handles the timer (an external-system concern),
  // never a synchronous setState call.
  const [lastToastedPick, setLastToastedPick] = useState<string | null>(null);
  if (state.lastPickedColor && state.lastPickedColor !== lastToastedPick) {
    setLastToastedPick(state.lastPickedColor);
    setShowColorToast(true);
  }
  useEffect(() => {
    if (!showColorToast) return;
    const timer = setTimeout(() => setShowColorToast(false), 2200);
    return () => clearTimeout(timer);
  }, [showColorToast]);

  // Create the engine once the canvas element exists, tear down on unmount.
  useEffect(() => {
    if (!canvasElRef.current) return;
    const engine = new CanvasEngine();
    engine.initialize(canvasElRef.current, {
      onCommit: (doc) => {
        selfCommitPendingRef.current = true;
        dispatch({ type: "canvas/commit", snapshot: doc });
      },
      onSelectionChange: (id) => dispatch({ type: "selection/set", selection: id }),
      onToolChange: (tool) => dispatch({ type: "tool/set", tool }),
      onTextEditRequest: (id) => setEditingTextId(id),
      onColorPicked: (hex) => dispatch({ type: "color/picked", hex }),
    });
    engineRef.current = engine;
    // BUG FIX: this effect destroys and recreates the engine whenever
    // state.asset toggles to/from null (e.g. switching to/from a blank
    // page in a multi-page project -- see the dependency below). The
    // brand-new engine instance has nothing loaded into it, but
    // loadedAssetIdRef (below) is a SEPARATE ref that survives the
    // engine's destruction -- without this reset, switching away from
    // a page and back to it would see the SAME page+asset composite
    // key as before, wrongly conclude "already loaded" on what is
    // actually a fresh, blank engine, and skip calling loadImage()
    // entirely. Symptom: the base image renders as nothing (the
    // checkerboard "no image" background shows through) while
    // doc.objects (drawn shapes/text) are still correctly present in
    // state, since those live in React state, not the engine's now-
    // stale load-tracking ref.
    loadedAssetIdRef.current = null;
    return () => {
      engine.destroy();
      engineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.asset !== null]);

  // Load a new image into the engine whenever the asset changes -- OR
  // whenever the active page changes, even to a page whose asset
  // happens to already be loaded (tracking key includes activePageId
  // specifically so switching back to a previously-visited page always
  // re-triggers this, rather than silently no-op'ing because the
  // asset id matched a stale ref from before the switch).
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine || !state.asset) return;
    const loadKey = `${state.activePageId}:${state.asset.id}`;
    if (loadedAssetIdRef.current === loadKey) return;

    loadedAssetIdRef.current = loadKey;
    const restoreDoc = state.pendingRestoreDocument;
    // Capture now -- already correct (set by the reducer, e.g.
    // loadPageIntoMirror) whenever restoreDoc is present; only used in
    // that branch, before anything else can change it.
    const preservedHistory = state.history;
    const preservedHistoryIndex = state.historyIndex;

    engine.loadImage(getAssetFileUrl(state.asset)).then(() => {
      if (restoreDoc) {
        // A recovered IndexedDB session OR a page switch -- apply the
        // full saved document (objects, drawing layer, crop, zoom, any
        // AI result) instead of the blank one loadImage() just made,
        // and preserve its actual undo/redo history rather than
        // collapsing to a single entry.
        engine.restoreState(restoreDoc);
        dispatch({ type: "session/consumeRestore" });
        lastSyncedHistoryIndexRef.current = preservedHistoryIndex;
        // history/historyIndex are already correct in state (the
        // reducer set them) -- no further dispatch needed here.
        void preservedHistory;
        return;
      }
      const doc = engine.getState();
      dispatch({ type: "canvas/init", snapshot: doc });
      lastSyncedHistoryIndexRef.current = 0;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.asset?.id, state.activePageId]);

  // Keep the engine's active tool in sync with toolbar selection.
  useEffect(() => {
    engineRef.current?.setTool(state.activeTool);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.activeTool]);

  // Restore engine state after undo/redo -- and ONLY after undo/redo.
  //
  // BUG FIX (Sprint 3 regression): this effect used to call
  // engine.restoreState() unconditionally on every historyIndex change,
  // including right after the engine's OWN commits. restoreState()'s
  // syncLayerCanvasFromDoc() synchronously CLEARS the drawing-layer
  // scratch canvas and asynchronously redraws it back from a decoded
  // image. If a new eraser/draw stroke started during that async
  // window -- exactly what happens when a user erases, then
  // immediately clicks elsewhere -- that stroke's pointerup captured
  // the momentarily-blank canvas as the new "truth" and wiped out the
  // entire drawing. The engine's internal state already IS
  // state.canvas immediately after its own commit; calling
  // restoreState() there was not just redundant but actively harmful.
  // See lib/editor/historySync.ts for the (unit-tested) decision logic.
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;

    const syncState: HistorySyncState = {
      lastSyncedHistoryIndex: lastSyncedHistoryIndexRef.current,
      selfCommitPending: selfCommitPendingRef.current,
    };
    const { shouldRestore, nextState } = decideHistorySync(syncState, state.historyIndex);
    lastSyncedHistoryIndexRef.current = nextState.lastSyncedHistoryIndex;
    selfCommitPendingRef.current = nextState.selfCommitPending;

    if (shouldRestore) {
      engine.restoreState(state.canvas);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.historyIndex, state.canvas]);

  // Tell the engine which object (if any) is being edited inline, so it
  // skips drawing that object's own glyph while the overlay shows it.
  useEffect(() => {
    engineRef.current?.setEditingObjectId(editingTextId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingTextId]);

  // Auto-focus and select-all when the overlay opens for a (new or
  // existing) text object, so typing immediately replaces the content.
  useEffect(() => {
    if (editingTextId && textEditorRef.current) {
      textEditorRef.current.focus();
      textEditorRef.current.select();
    }
  }, [editingTextId]);

  const editingObject = state.canvas.objects?.find((o) => o.id === editingTextId);
  const editingTextObject = editingObject?.type === "text" ? editingObject : undefined;

  // Convert the selected text object's SOURCE-image coordinates into
  // on-screen CSS pixels relative to the canvas element. The canvas has
  // no explicit CSS width/height, so its bitmap pixels map 1:1 to CSS
  // pixels -- only zoom and the active crop offset matter here.
  const overlayStyle = useMemo(() => {
    if (!editingTextObject) return null;
    const region = state.canvas.crop ?? {
      x: 0,
      y: 0,
      width: state.canvas.sourceWidth,
      height: state.canvas.sourceHeight,
    };
    const zoom = state.canvas.zoom;
    return {
      left: (editingTextObject.x - region.x) * zoom,
      top: (editingTextObject.y - region.y) * zoom,
      width: editingTextObject.width * zoom,
      height: editingTextObject.height * zoom,
      fontSize: editingTextObject.fontSize * zoom,
      color: editingTextObject.color,
      fontWeight: editingTextObject.bold ? 700 : 400,
      fontStyle: editingTextObject.italic ? "italic" : "normal",
      transform: `rotate(${editingTextObject.rotation}rad)`,
      transformOrigin: "center center",
    } as const;
  }, [editingTextObject, state.canvas]);

  function closeTextEditor(commit: boolean) {
    if (commit && textEditorRef.current && editingTextId) {
      engineRef.current?.updateSelectedObject({ text: textEditorRef.current.value });
    }
    setEditingTextId(null);
  }

  const AI_BUSY_LABELS: Record<string, string> = {
    preparing: "Preparing…",
    uploading: "Uploading…",
    queued: "Queued…",
    generating: "Generating…",
    "processing-result": "Finishing up…",
  };
  const aiBusyLabel = AI_BUSY_LABELS[aiEdit.status];

  if (!state.asset) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-zinc-900">
        <UploadDropzone />
      </div>
    );
  }

  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-auto bg-zinc-900 p-6 pb-10 [scrollbar-gutter:stable]">
      <div className="relative inline-block">
        <canvas
          ref={canvasElRef}
          className="rounded-sm shadow-2xl [touch-action:none]"
          style={{ background: "repeating-conic-gradient(#27272a 0% 25%, #18181b 0% 50%) 0 0 / 20px 20px" }}
        />

        {aiBusyLabel && (
          <div
            className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-sm"
            aria-live="polite"
          >
            <div className="astra-ai-shimmer absolute inset-0 rounded-sm" />
            <div className="relative flex items-center gap-2 rounded-full border border-[#6366F1]/50 bg-slate-950/80 px-4 py-2 text-sm font-medium text-slate-100 shadow-lg backdrop-blur-sm">
              <span className="h-2 w-2 animate-pulse rounded-full bg-[#38BDF8]" />

              {aiBusyLabel}
            </div>
          </div>
        )}

        {showColorToast && state.lastPickedColor && (
          <div
            className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2"
            aria-live="polite"
          >
            <div className="flex items-center gap-2.5 rounded-full border border-slate-700/50 bg-slate-950/90 px-4 py-2 text-sm text-slate-100 shadow-lg backdrop-blur-sm">
              <span
                className="h-4 w-4 rounded-full border border-white/20"
                style={{ backgroundColor: state.lastPickedColor }}
              />
              Picked {state.lastPickedColor} — applied to brush &amp; shape fill
            </div>
          </div>
        )}

        {editingTextObject && overlayStyle && (
          <textarea
            key={editingTextObject.id}
            ref={textEditorRef}
            defaultValue={editingTextObject.text}
            onBlur={() => {
              if (suppressNextBlurRef.current) {
                suppressNextBlurRef.current = false;
                return;
              }
              closeTextEditor(true);
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.preventDefault();
                suppressNextBlurRef.current = true;
                closeTextEditor(false);
              } else if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                suppressNextBlurRef.current = true;
                closeTextEditor(true);
              }
            }}
            className="absolute resize-none overflow-hidden border-2 border-dashed border-indigo-500 bg-black/30 leading-tight outline-none"
            style={{
              left: overlayStyle.left,
              top: overlayStyle.top,
              width: Math.max(overlayStyle.width, 40),
              height: Math.max(overlayStyle.height, 24),
              fontSize: overlayStyle.fontSize,
              color: overlayStyle.color,
              fontWeight: overlayStyle.fontWeight,
              fontStyle: overlayStyle.fontStyle,
              fontFamily: "system-ui, sans-serif",
              lineHeight: 1.25,
              transform: overlayStyle.transform,
              transformOrigin: overlayStyle.transformOrigin,
              padding: 0,
            }}
          />
        )}
      </div>
    </div>
  );
}
