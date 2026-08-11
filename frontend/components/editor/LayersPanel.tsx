"use client";

import { useEditor } from "@/lib/editor/EditorProvider";
import { useCanvasEngine } from "@/lib/editor/EngineContext";

function objectLabel(obj: { type: string }, index: number): string {
  if (obj.type === "text") return `Text ${index + 1}`;
  return `Shape ${index + 1}`;
}

/**
 * Lightweight layer stack (Sprint 3): Base Image (always on, not
 * toggleable -- it IS the canvas), the Draw/Eraser raster layer, and
 * each text/shape object individually. Reordering moves an object's
 * position in doc.objects[], which IS z-order (see engine.ts).
 */
export function LayersPanel() {
  const { state } = useEditor();
  const engineRef = useCanvasEngine();
  const objects = state.canvas.objects ?? [];
  const drawingLayer = state.canvas.drawingLayer;

  if (!state.asset) return null;

  return (
    <div className="flex flex-col gap-2 border-t border-slate-700/50 p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Layers</p>

      <div className="flex flex-col gap-1">
        {/* Objects listed topmost-first (reverse of draw order) to match how a layers panel usually reads. */}
        {[...objects].reverse().map((obj) => {
          const index = objects.findIndex((o) => o.id === obj.id);
          const isSelected = state.canvas.selectedObjectId === obj.id;
          return (
            <div
              key={obj.id}
              className={[
                "flex items-center gap-1.5 rounded px-1.5 py-1 text-xs",
                isSelected ? "bg-indigo-600/20 text-indigo-200" : "text-[#94A3B8]",
              ].join(" ")}
            >
              <button
                type="button"
                title={obj.visible ? "Hide layer" : "Show layer"}
                onClick={() => engineRef.current?.setObjectVisibility(obj.id, !obj.visible)}
                className="w-4 shrink-0 text-center"
              >
                {obj.visible ? "👁" : "—"}
              </button>
              <button
                type="button"
                title={obj.locked ? "Unlock layer" : "Lock layer"}
                onClick={() => engineRef.current?.setObjectLocked(obj.id, !obj.locked)}
                className="w-4 shrink-0 text-center"
              >
                {obj.locked ? "🔒" : "🔓"}
              </button>
              <button
                type="button"
                onClick={() => engineRef.current?.selectObject(obj.id)}
                className="min-w-0 flex-1 truncate text-left"
              >
                {objectLabel(obj, index)}
              </button>
              <button
                type="button"
                title="Move up"
                onClick={() => engineRef.current?.moveObjectUp(obj.id)}
                disabled={index === objects.length - 1}
                className="w-4 shrink-0 text-center disabled:opacity-25"
              >
                ↑
              </button>
              <button
                type="button"
                title="Move down"
                onClick={() => engineRef.current?.moveObjectDown(obj.id)}
                disabled={index === 0}
                className="w-4 shrink-0 text-center disabled:opacity-25"
              >
                ↓
              </button>
              <button
                type="button"
                title="Delete"
                onClick={() => engineRef.current?.deleteObject(obj.id)}
                className="w-4 shrink-0 text-center text-red-400/80 hover:text-red-300"
              >
                ×
              </button>
            </div>
          );
        })}

        <div className="flex items-center gap-1.5 rounded px-1.5 py-1 text-xs text-[#94A3B8]">
          <button
            type="button"
            title={drawingLayer.visible ? "Hide layer" : "Show layer"}
            onClick={() => engineRef.current?.setDrawingLayerVisibility(!drawingLayer.visible)}
            className="w-4 shrink-0 text-center"
          >
            {drawingLayer.visible ? "👁" : "—"}
          </button>
          <button
            type="button"
            title={drawingLayer.locked ? "Unlock layer" : "Lock layer"}
            onClick={() => engineRef.current?.setDrawingLayerLocked(!drawingLayer.locked)}
            className="w-4 shrink-0 text-center"
          >
            {drawingLayer.locked ? "🔒" : "🔓"}
          </button>
          <span className="flex-1 truncate">Draw / Eraser</span>
        </div>

        <div className="flex items-center gap-1.5 rounded px-1.5 py-1 text-xs text-slate-500">
          <span className="w-4 shrink-0 text-center">👁</span>
          <span className="w-4 shrink-0" />
          <span className="flex-1 truncate">
            Base Image{state.canvas.baseImageOverride ? " (AI edited)" : ""}
          </span>
        </div>
      </div>
    </div>
  );
}
