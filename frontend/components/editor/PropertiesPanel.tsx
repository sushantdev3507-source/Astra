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

type Updater = (partial: Partial<TextObject> | Partial<ShapeObject>) => void;

/** Shadow + Glow controls, shared between text and shape objects (both
 * extend BaseObject, which carries these fields -- see types.ts). */
function EffectsControls({ selected, update }: { selected: EditorObject; update: Updater }) {
  const shadow = selected.shadow;
  const glow = selected.glow;

  return (
    <div className="flex flex-col gap-2 border-t border-slate-800 pt-2.5">
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-400">Shadow</span>
        <button
          type="button"
          onClick={() =>
            update({
              shadow: shadow ? null : { color: "#000000", blur: 8, offsetX: 4, offsetY: 4 },
              glow: null, // mutually exclusive -- see BaseObject.glow's doc comment
            })
          }
          className={`rounded px-2 py-0.5 text-[11px] font-medium ${shadow ? "bg-[#6366F1] text-white" : "border border-slate-700 text-slate-400"}`}
        >
          {shadow ? "On" : "Off"}
        </button>
      </div>
      {shadow && (
        <div className="flex flex-col gap-1.5 pl-1">
          <label className="flex items-center justify-between text-[11px] text-slate-500">
            Color
            <input
              key={`shadowColor-${selected.id}`}
              type="color"
              defaultValue={shadow.color}
              onChange={(e) => update({ shadow: { ...shadow, color: e.target.value } })}
              className="h-5 w-7 cursor-pointer rounded border border-slate-700 bg-transparent"
            />
          </label>
          <label className="flex items-center justify-between text-[11px] text-slate-500">
            Blur
            <input
              key={`shadowBlur-${selected.id}`}
              type="number"
              min={0}
              defaultValue={shadow.blur}
              onBlur={(e) => update({ shadow: { ...shadow, blur: Number(e.target.value) || 0 } })}
              className="w-14 rounded border border-slate-700 bg-slate-900 px-1.5 py-0.5 text-right text-slate-200"
            />
          </label>
          <label className="flex items-center justify-between text-[11px] text-slate-500">
            Offset X
            <input
              key={`shadowOffX-${selected.id}`}
              type="number"
              defaultValue={shadow.offsetX}
              onBlur={(e) => update({ shadow: { ...shadow, offsetX: Number(e.target.value) || 0 } })}
              className="w-14 rounded border border-slate-700 bg-slate-900 px-1.5 py-0.5 text-right text-slate-200"
            />
          </label>
          <label className="flex items-center justify-between text-[11px] text-slate-500">
            Offset Y
            <input
              key={`shadowOffY-${selected.id}`}
              type="number"
              defaultValue={shadow.offsetY}
              onBlur={(e) => update({ shadow: { ...shadow, offsetY: Number(e.target.value) || 0 } })}
              className="w-14 rounded border border-slate-700 bg-slate-900 px-1.5 py-0.5 text-right text-slate-200"
            />
          </label>
        </div>
      )}

      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-400">Glow</span>
        <button
          type="button"
          onClick={() =>
            update({
              glow: glow ? null : { color: "#38BDF8", blur: 16 },
              shadow: null, // mutually exclusive
            })
          }
          className={`rounded px-2 py-0.5 text-[11px] font-medium ${glow ? "bg-[#6366F1] text-white" : "border border-slate-700 text-slate-400"}`}
        >
          {glow ? "On" : "Off"}
        </button>
      </div>
      {glow && (
        <div className="flex flex-col gap-1.5 pl-1">
          <label className="flex items-center justify-between text-[11px] text-slate-500">
            Color
            <input
              key={`glowColor-${selected.id}`}
              type="color"
              defaultValue={glow.color}
              onChange={(e) => update({ glow: { ...glow, color: e.target.value } })}
              className="h-5 w-7 cursor-pointer rounded border border-slate-700 bg-transparent"
            />
          </label>
          <label className="flex items-center justify-between text-[11px] text-slate-500">
            Blur
            <input
              key={`glowBlur-${selected.id}`}
              type="number"
              min={0}
              defaultValue={glow.blur}
              onBlur={(e) => update({ glow: { ...glow, blur: Number(e.target.value) || 0 } })}
              className="w-14 rounded border border-slate-700 bg-slate-900 px-1.5 py-0.5 text-right text-slate-200"
            />
          </label>
        </div>
      )}
    </div>
  );
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
              key={`fontSize-${selected.id}`}
              type="number"
              defaultValue={selected.fontSize}
              onBlur={(e) => update({ fontSize: Number(e.target.value) || selected.fontSize })}
              className="w-16 rounded border border-slate-700 bg-slate-900 px-2 py-1 text-right text-slate-200"
            />
          </label>
          <label className="flex items-center justify-between text-xs text-slate-400">
            Color
            <input
              key={`color-${selected.id}`}
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
          <EffectsControls selected={selected} update={update} />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => engineRef.current?.duplicateSelected()}
              className="flex-1 rounded border border-slate-700 px-2 py-1 text-xs text-slate-300 hover:bg-slate-800"
            >
              Duplicate
            </button>
            <button
              type="button"
              onClick={() => engineRef.current?.deleteSelected()}
              className="flex-1 rounded border border-red-900 px-2 py-1 text-xs text-red-400 hover:bg-red-950"
            >
              Delete
            </button>
          </div>
        </div>
      ) : selected?.type === "shape" ? (
        <div className="flex flex-col gap-3 text-sm">
          <p className="text-xs text-slate-500">Shape ({selected.shapeKind})</p>
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">Gradient fill</span>
            <button
              type="button"
              onClick={() =>
                update({
                  fillGradient: selected.fillGradient
                    ? null
                    : { from: selected.fill.startsWith("#") ? selected.fill : "#6366f1", to: "#38BDF8", angleDeg: 90 },
                })
              }
              className={`rounded px-2 py-0.5 text-[11px] font-medium ${selected.fillGradient ? "bg-[#6366F1] text-white" : "border border-slate-700 text-slate-400"}`}
            >
              {selected.fillGradient ? "On" : "Off"}
            </button>
          </div>
          {selected.fillGradient ? (
            <div className="flex flex-col gap-1.5 pl-1">
              <label className="flex items-center justify-between text-[11px] text-slate-500">
                From
                <input
                  key={`gradFrom-${selected.id}`}
                  type="color"
                  defaultValue={selected.fillGradient.from}
                  onChange={(e) => update({ fillGradient: { ...selected.fillGradient!, from: e.target.value } })}
                  className="h-5 w-7 cursor-pointer rounded border border-slate-700 bg-transparent"
                />
              </label>
              <label className="flex items-center justify-between text-[11px] text-slate-500">
                To
                <input
                  key={`gradTo-${selected.id}`}
                  type="color"
                  defaultValue={selected.fillGradient.to}
                  onChange={(e) => update({ fillGradient: { ...selected.fillGradient!, to: e.target.value } })}
                  className="h-5 w-7 cursor-pointer rounded border border-slate-700 bg-transparent"
                />
              </label>
              <label className="flex items-center justify-between text-[11px] text-slate-500">
                Angle
                <input
                  key={`gradAngle-${selected.id}`}
                  type="number"
                  defaultValue={selected.fillGradient.angleDeg}
                  onBlur={(e) =>
                    update({ fillGradient: { ...selected.fillGradient!, angleDeg: Number(e.target.value) || 0 } })
                  }
                  className="w-14 rounded border border-slate-700 bg-slate-900 px-1.5 py-0.5 text-right text-slate-200"
                />
              </label>
            </div>
          ) : (
            <label className="flex items-center justify-between text-xs text-slate-400">
              Fill
              <input
                key={`fill-${selected.id}`}
                type="color"
                defaultValue={selected.fill.startsWith("#") ? selected.fill : "#6366f1"}
                onChange={(e) => update({ fill: e.target.value })}
                className="h-6 w-8 cursor-pointer rounded border border-slate-700 bg-transparent"
              />
            </label>
          )}
          <label className="flex items-center justify-between text-xs text-slate-400">
            Stroke width
            <input
              key={`strokeWidth-${selected.id}`}
              type="number"
              defaultValue={selected.strokeWidth}
              onBlur={(e) => update({ strokeWidth: Number(e.target.value) })}
              className="w-16 rounded border border-slate-700 bg-slate-900 px-2 py-1 text-right text-slate-200"
            />
          </label>
          <p className="text-xs text-slate-500">
            {Math.round(selected.width)} × {Math.round(selected.height)}px
          </p>
          <EffectsControls selected={selected} update={update} />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => engineRef.current?.duplicateSelected()}
              className="flex-1 rounded border border-slate-700 px-2 py-1 text-xs text-slate-300 hover:bg-slate-800"
            >
              Duplicate
            </button>
            <button
              type="button"
              onClick={() => engineRef.current?.deleteSelected()}
              className="flex-1 rounded border border-red-900 px-2 py-1 text-xs text-red-400 hover:bg-red-950"
            >
              Delete
            </button>
          </div>
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
