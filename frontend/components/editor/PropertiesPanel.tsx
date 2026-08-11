"use client";

import { useRef } from "react";
import { useEditor } from "@/lib/editor/EditorProvider";
import { useCanvasEngine } from "@/lib/editor/EngineContext";
import type { EditorObject, TextObject, ShapeObject } from "@/lib/canvas-engine";
import { LayersPanel } from "./LayersPanel";

function formatBytes(bytes?: number): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function PropertiesPanel() {
  const { state } = useEditor();
  const engineRef = useCanvasEngine();
  const asset = state.asset;
  const textAreaRef = useRef<HTMLTextAreaElement | null>(null);

  const selected: EditorObject | undefined = state.canvas.objects?.find(
    (o) => o.id === state.canvas.selectedObjectId
  );

  // NOTE: typing text itself happens via the inline overlay directly on
  // the canvas (see Canvas.tsx) -- it opens automatically right after
  // placing text, or on double-click. This panel is the secondary
  // surface for style properties (font size, color, bold/italic) and a
  // fallback text field; it intentionally does NOT steal focus on
  // selection, since that would fight with the canvas overlay's focus.

  function update(partial: Partial<TextObject> | Partial<ShapeObject>) {
    engineRef.current?.updateSelectedObject(partial);
  }

  return (
    <aside className="flex w-56 shrink-0 flex-col gap-3 overflow-y-auto border-l border-slate-700/50 bg-slate-900/80 p-3 backdrop-blur-md">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Properties</p>

      {!asset ? (
        <p className="text-sm text-slate-600">No asset loaded.</p>
      ) : selected?.type === "text" ? (
        <div className="flex flex-col gap-3 text-sm">
          <p className="text-xs text-slate-500">
            Double-click the text on the canvas to edit its content directly.
            Style options below.
          </p>
          <label className="flex flex-col gap-1 text-xs text-slate-400">
            Text
            <textarea
              key={selected.id}
              ref={textAreaRef}
              defaultValue={selected.text}
              onBlur={(e) => update({ text: e.target.value })}
              rows={3}
              className="resize-none rounded border border-slate-700 bg-slate-900 px-2 py-1 text-sm text-slate-200"
            />
          </label>
          <label className="flex items-center justify-between text-xs text-slate-400">
            Font size
            <input
              type="number"
              defaultValue={selected.fontSize}
              onBlur={(e) => update({ fontSize: Number(e.target.value) || selected.fontSize })}
              className="w-16 rounded border border-slate-700 bg-slate-900 px-2 py-1 text-right text-slate-200"
            />
          </label>
          <label className="flex items-center justify-between text-xs text-slate-400">
            Color
            <input
              type="color"
              defaultValue={selected.color}
              onChange={(e) => update({ color: e.target.value })}
              className="h-6 w-8 cursor-pointer rounded border border-slate-700 bg-transparent"
            />
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => update({ bold: !selected.bold })}
              className={`flex-1 rounded border px-2 py-1 text-xs font-bold ${selected.bold ? "border-indigo-500 bg-indigo-600 text-white" : "border-slate-700 text-slate-300"}`}
            >
              B
            </button>
            <button
              type="button"
              onClick={() => update({ italic: !selected.italic })}
              className={`flex-1 rounded border px-2 py-1 text-xs italic ${selected.italic ? "border-indigo-500 bg-indigo-600 text-white" : "border-slate-700 text-slate-300"}`}
            >
              I
            </button>
          </div>
          <button
            type="button"
            onClick={() => engineRef.current?.deleteSelected()}
            className="rounded border border-red-900 px-2 py-1 text-xs text-red-400 hover:bg-red-950"
          >
            Delete
          </button>
        </div>
      ) : selected?.type === "shape" ? (
        <div className="flex flex-col gap-3 text-sm">
          <p className="text-xs text-slate-500">Shape ({selected.shapeKind})</p>
          <label className="flex items-center justify-between text-xs text-slate-400">
            Fill
            <input
              type="color"
              defaultValue={selected.fill.startsWith("#") ? selected.fill : "#6366f1"}
              onChange={(e) => update({ fill: e.target.value })}
              className="h-6 w-8 cursor-pointer rounded border border-slate-700 bg-transparent"
            />
          </label>
          <label className="flex items-center justify-between text-xs text-slate-400">
            Stroke width
            <input
              type="number"
              defaultValue={selected.strokeWidth}
              onBlur={(e) => update({ strokeWidth: Number(e.target.value) })}
              className="w-16 rounded border border-slate-700 bg-slate-900 px-2 py-1 text-right text-slate-200"
            />
          </label>
          <p className="text-xs text-slate-500">
            {Math.round(selected.width)} × {Math.round(selected.height)}px
          </p>
          <button
            type="button"
            onClick={() => engineRef.current?.deleteSelected()}
            className="rounded border border-red-900 px-2 py-1 text-xs text-red-400 hover:bg-red-950"
          >
            Delete
          </button>
        </div>
      ) : (
        <dl className="flex flex-col gap-2 text-sm">
          <div>
            <dt className="text-xs text-slate-500">Name</dt>
            <dd className="truncate text-slate-200">{asset.name}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Type</dt>
            <dd className="text-slate-200">{asset.type}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Dimensions</dt>
            <dd className="text-slate-200">
              {asset.width && asset.height ? `${asset.width} × ${asset.height}px` : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">File size</dt>
            <dd className="text-slate-200">{formatBytes(asset.size)}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Zoom</dt>
            <dd className="text-slate-200">{Math.round(state.canvas.zoom * 100)}%</dd>
          </div>
        </dl>
      )}
      <LayersPanel />
    </aside>
  );
}
