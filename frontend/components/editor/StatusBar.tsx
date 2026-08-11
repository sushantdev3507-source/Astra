"use client";

import { useEditor } from "@/lib/editor/EditorProvider";
import { useCanvasEngine } from "@/lib/editor/EngineContext";

const ZOOM_STEP = 0.25;
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 4;

export function StatusBar() {
  const { state, dispatch } = useEditor();
  const engineRef = useCanvasEngine();

  const canUndo = state.historyIndex > 0;
  const canRedo = state.historyIndex < state.history.length - 1;

  function zoomIn() {
    const next = Math.min(MAX_ZOOM, state.canvas.zoom + ZOOM_STEP);
    engineRef.current?.setZoom(next);
  }

  function zoomOut() {
    const next = Math.max(MIN_ZOOM, state.canvas.zoom - ZOOM_STEP);
    engineRef.current?.setZoom(next);
  }

  function resetView() {
    engineRef.current?.resetView();
  }

  const region = state.canvas.crop ?? {
    width: state.canvas.sourceWidth,
    height: state.canvas.sourceHeight,
  };

  return (
    <footer className="relative z-10 flex h-14 shrink-0 items-center justify-between gap-4 border-t border-slate-700/50 bg-slate-900/80 px-5 py-2 text-sm text-slate-300 backdrop-blur-md">
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          disabled={!canUndo}
          onClick={() => dispatch({ type: "history/undo" })}
          className="shrink-0 whitespace-nowrap rounded px-2.5 py-1.5 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-30"
        >
          ↶ Undo
        </button>
        <button
          type="button"
          disabled={!canRedo}
          onClick={() => dispatch({ type: "history/redo" })}
          className="shrink-0 whitespace-nowrap rounded px-2.5 py-1.5 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-30"
        >
          ↷ Redo
        </button>
      </div>

      {state.asset && (
        <span className="hidden shrink-0 tabular-nums text-slate-500 sm:inline">
          {region.width} × {region.height}px
        </span>
      )}

      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={zoomOut}
          disabled={!state.asset}
          className="shrink-0 rounded px-2.5 py-1.5 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-30"
        >
          −
        </button>
        <span className="w-14 shrink-0 text-center tabular-nums text-slate-400">
          {Math.round(state.canvas.zoom * 100)}%
        </span>
        <button
          type="button"
          onClick={zoomIn}
          disabled={!state.asset}
          className="shrink-0 rounded px-2.5 py-1.5 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-30"
        >
          +
        </button>
        <button
          type="button"
          onClick={resetView}
          disabled={!state.asset}
          className="ml-2 shrink-0 whitespace-nowrap rounded px-2.5 py-1.5 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-30"
        >
          Reset
        </button>
      </div>
    </footer>
  );
}
