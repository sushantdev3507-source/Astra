"use client";

import { useEffect, useState } from "react";
import {
  MousePointer2,
  Paintbrush,
  Eraser as EraserIcon,
  Type,
  Shapes,
  Crop as CropIcon,
  Sparkles,
  Pipette,
} from "lucide-react";
import { useEditor } from "@/lib/editor/EditorProvider";
import { useCanvasEngine } from "@/lib/editor/EngineContext";
import { TOOLS } from "@/lib/editor/types";
import type { ShapeKind, ToolId } from "@/lib/canvas-engine";
import { useAiEditContext } from "@/lib/editor/AiEditContext";

const SHAPE_KINDS: { id: ShapeKind; label: string }[] = [
  { id: "rect", label: "Rectangle" },
  { id: "ellipse", label: "Ellipse" },
  { id: "line", label: "Line" },
  { id: "triangle", label: "Triangle" },
  { id: "arrow", label: "Arrow" },
  { id: "star", label: "Star" },
];

const TOOL_ICONS: Record<ToolId, typeof MousePointer2> = {
  select: MousePointer2,
  draw: Paintbrush,
  eraser: EraserIcon,
  text: Type,
  shape: Shapes,
  crop: CropIcon,
  eyedropper: Pipette,
  "ai-edit": Sparkles,
};

const TOOL_SHORTCUTS: Record<ToolId, string> = {
  select: "V",
  draw: "B",
  eraser: "E",
  text: "T",
  shape: "S",
  crop: "C",
  eyedropper: "I",
  "ai-edit": "M",
};

// Muted-but-readable inactive-item color (Sprint 3 contrast fix, carried into Sprint 4's palette).
const INACTIVE_TEXT = "text-[#94A3B8]";

export function Toolbar() {
  const { state, dispatch } = useEditor();
  const engineRef = useCanvasEngine();
  const aiEdit = useAiEditContext();

  const [brushColor, setBrushColor] = useState("#f97316");
  const [brushSize, setBrushSize] = useState(8);
  const [brushOpacity, setBrushOpacity] = useState(1);
  const [shapeKind, setShapeKind] = useState<ShapeKind>("rect");
  const [shapeFill, setShapeFill] = useState("#6366f1");
  const [textPreset, setTextPresetState] = useState<"heading" | "paragraph">("heading");
  const [aiMaskMode, setAiMaskModeState] = useState<"paint" | "erase">("paint");
  const [aiMaskBrushSize, setAiMaskBrushSizeState] = useState(40);
  const [aiPrompt, setAiPrompt] = useState("");
  const [featherRadius, setFeatherRadius] = useState(6);

  function selectTool(id: ToolId) {
    dispatch({ type: "tool/set", tool: id });
    engineRef.current?.setTool(id);
    if (id !== "ai-edit") aiEdit.reset();
  }

  function applyBrush(color: string, size: number, opacity: number = brushOpacity) {
    setBrushColor(color);
    setBrushSize(size);
    setBrushOpacity(opacity);
    engineRef.current?.setBrushOptions({ color, size, opacity });
  }

  function applyShapeStyle(kind: ShapeKind, fill: string) {
    setShapeKind(kind);
    setShapeFill(fill);
    engineRef.current?.setShapeStyle({ shapeKind: kind, fill, stroke: fill, strokeWidth: 2 });
  }

  function applyTextPreset(preset: "heading" | "paragraph") {
    setTextPresetState(preset);
    engineRef.current?.setTextPreset(preset);
  }

  function applyAiMaskMode(mode: "paint" | "erase") {
    setAiMaskModeState(mode);
    engineRef.current?.setAiMaskMode(mode);
  }

  function applyAiMaskBrushSize(size: number) {
    setAiMaskBrushSizeState(size);
    engineRef.current?.setAiMaskBrushSize(size);
  }

  // Eyedropper picks (Toolbar's UI has no separate "which field" step --
  // apply to both brush and shape fill, so whichever the user reaches
  // for next already has it). Tracked via a comparison STATE value
  // (not a ref -- this project's lint config disallows ref reads
  // during render) updated during render itself, React's documented
  // pattern for "adjust state when an external value changes" without
  // an effect. The effect below is reserved for the imperative engine
  // calls only.
  const [lastProcessedPick, setLastProcessedPick] = useState<string | null>(null);
  if (state.lastPickedColor && state.lastPickedColor !== lastProcessedPick) {
    setLastProcessedPick(state.lastPickedColor);
    setBrushColor(state.lastPickedColor);
    setShapeFill(state.lastPickedColor);
  }
  useEffect(() => {
    if (!state.lastPickedColor) return;
    engineRef.current?.setBrushOptions({ color: state.lastPickedColor, size: brushSize });
    engineRef.current?.setShapeStyle({
      shapeKind,
      fill: state.lastPickedColor,
      stroke: state.lastPickedColor,
      strokeWidth: 2,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.lastPickedColor]);

  const isGenerateBusy = [
    "preparing",
    "uploading",
    "queued",
    "generating",
    "processing-result",
  ].includes(aiEdit.status);

  return (
    <aside className="flex w-52 shrink-0 flex-col gap-1 overflow-y-auto border-r border-slate-700/50 bg-slate-900/80 p-2 backdrop-blur-md">
      <p className="px-2 pb-1 pt-1 text-xs font-medium uppercase tracking-wide text-slate-500">
        Toolbar
      </p>
      {TOOLS.map((tool) => {
        const isActive = state.activeTool === tool.id;
        const Icon = TOOL_ICONS[tool.id];
        const disabled = tool.isDisabled || !state.asset;
        return (
          <button
            key={tool.id}
            type="button"
            disabled={disabled}
            onClick={() => selectTool(tool.id)}
            title={`${tool.label} (${TOOL_SHORTCUTS[tool.id]})`}
            aria-label={tool.label}
            className={[
              "group flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition",
              isActive
                ? "bg-[#6366F1] text-white shadow-[0_0_0_1px_rgba(99,102,241,0.5)]"
                : `${INACTIVE_TEXT} hover:bg-slate-800/70 hover:text-slate-100`,
              disabled ? "cursor-not-allowed opacity-40" : "",
            ].join(" ")}
          >
            <Icon size={16} strokeWidth={2} className="shrink-0" />
            <span className="flex-1 text-left">{tool.label}</span>
            <span
              className={[
                "rounded px-1.5 py-0.5 text-[10px] font-medium tabular-nums",
                isActive ? "bg-white/20 text-white" : "bg-slate-800 text-slate-500 group-hover:text-slate-300",
              ].join(" ")}
            >
              {TOOL_SHORTCUTS[tool.id]}
            </span>
            {tool.id === "ai-edit" && !isActive && (
              <span className="rounded bg-[#38BDF8]/20 px-1.5 py-0.5 text-[9px] font-semibold text-[#38BDF8]">
                AI
              </span>
            )}
          </button>
        );
      })}

      {(state.activeTool === "draw" || state.activeTool === "eraser") && (
        <div className="mt-2 flex flex-col gap-2 rounded-lg border border-slate-700/50 bg-slate-900/60 p-2.5">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            {state.activeTool === "draw" ? "Brush" : "Eraser"}
          </p>
          {state.activeTool === "draw" && (
            <label className={`flex items-center justify-between text-xs ${INACTIVE_TEXT}`}>
              Color
              <input
                type="color"
                value={brushColor}
                onChange={(e) => applyBrush(e.target.value, brushSize)}
                className="h-6 w-8 cursor-pointer rounded border border-slate-700 bg-transparent"
              />
            </label>
          )}
          <label className={`flex flex-col gap-1 text-xs ${INACTIVE_TEXT}`}>
            Size: {brushSize}px
            <input
              type="range"
              min={1}
              max={60}
              value={brushSize}
              onChange={(e) => applyBrush(brushColor, Number(e.target.value))}
              className="accent-[#6366F1]"
            />
          </label>
          <label className={`flex flex-col gap-1 text-xs ${INACTIVE_TEXT}`}>
            Opacity: {Math.round(brushOpacity * 100)}%
            <input
              type="range"
              min={0.05}
              max={1}
              step={0.05}
              value={brushOpacity}
              onChange={(e) => applyBrush(brushColor, brushSize, Number(e.target.value))}
              className="accent-[#6366F1]"
            />
          </label>
        </div>
      )}

      {state.activeTool === "text" && (
        <div className="mt-2 flex flex-col gap-2 rounded-lg border border-slate-700/50 bg-slate-900/60 p-2.5">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Text style</p>
          <p className={`text-[11px] ${INACTIVE_TEXT}`}>Choose a style, then click the canvas to place it.</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => applyTextPreset("heading")}
              className={[
                "flex-1 rounded px-2 py-1.5 text-xs font-medium transition",
                textPreset === "heading" ? "bg-[#6366F1] text-white" : `border border-slate-700 ${INACTIVE_TEXT}`,
              ].join(" ")}
            >
              Heading
            </button>
            <button
              type="button"
              onClick={() => applyTextPreset("paragraph")}
              className={[
                "flex-1 rounded px-2 py-1.5 text-xs font-medium transition",
                textPreset === "paragraph" ? "bg-[#6366F1] text-white" : `border border-slate-700 ${INACTIVE_TEXT}`,
              ].join(" ")}
            >
              Paragraph
            </button>
          </div>
        </div>
      )}

      {state.activeTool === "shape" && (
        <div className="mt-2 flex flex-col gap-2 rounded-lg border border-slate-700/50 bg-slate-900/60 p-2.5">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Shape</p>
          <select
            value={shapeKind}
            onChange={(e) => applyShapeStyle(e.target.value as ShapeKind, shapeFill)}
            className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-200"
          >
            {SHAPE_KINDS.map((k) => (
              <option key={k.id} value={k.id}>
                {k.label}
              </option>
            ))}
          </select>
          <label className={`flex items-center justify-between text-xs ${INACTIVE_TEXT}`}>
            Fill
            <input
              type="color"
              value={shapeFill}
              onChange={(e) => applyShapeStyle(shapeKind, e.target.value)}
              className="h-6 w-8 cursor-pointer rounded border border-slate-700 bg-transparent"
            />
          </label>
        </div>
      )}

      {state.activeTool === "crop" && (
        <div className="mt-2 flex flex-col gap-2 rounded-lg border border-slate-700/50 bg-slate-900/60 p-2.5">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Crop</p>
          <p className={`text-[11px] ${INACTIVE_TEXT}`}>Drag on the canvas to select a region.</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => engineRef.current?.applyCrop()}
              className="flex-1 rounded bg-[#6366F1] px-2 py-1 text-xs font-medium text-white hover:bg-[#5457e0]"
            >
              Apply
            </button>
            <button
              type="button"
              onClick={() => engineRef.current?.cancelCrop()}
              className={`flex-1 rounded border border-slate-700 px-2 py-1 text-xs ${INACTIVE_TEXT} hover:bg-slate-800`}
            >
              Cancel
            </button>
          </div>
          {state.canvas.crop && (
            <button
              type="button"
              onClick={() => engineRef.current?.clearCrop()}
              className={`rounded border border-slate-700 px-2 py-1 text-xs ${INACTIVE_TEXT} hover:bg-slate-800`}
            >
              Remove existing crop
            </button>
          )}
        </div>
      )}

      {state.activeTool === "ai-edit" && (
        <div className="mt-2 flex flex-col gap-3 rounded-lg border border-[#6366F1]/40 bg-[#6366F1]/[0.07] p-2.5">
          <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-[#38BDF8]">
            <Sparkles size={12} /> AI Edit
          </p>
          <p className={`-mt-1 text-[11px] leading-snug ${INACTIVE_TEXT}`}>
            Painting a region below is optional. Describe the edit in the
            prompt and Astra will apply it to the whole image if nothing
            is painted, or just the painted region if it is.
          </p>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => applyAiMaskMode("paint")}
              className={[
                "flex-1 rounded px-2 py-1 text-xs font-medium transition",
                aiMaskMode === "paint" ? "bg-[#6366F1] text-white" : `border border-slate-700 ${INACTIVE_TEXT}`,
              ].join(" ")}
            >
              Paint
            </button>
            <button
              type="button"
              onClick={() => applyAiMaskMode("erase")}
              className={[
                "flex-1 rounded px-2 py-1 text-xs font-medium transition",
                aiMaskMode === "erase" ? "bg-[#6366F1] text-white" : `border border-slate-700 ${INACTIVE_TEXT}`,
              ].join(" ")}
            >
              Erase
            </button>
          </div>

          <label className={`flex flex-col gap-1 text-xs ${INACTIVE_TEXT}`}>
            Brush size: {aiMaskBrushSize}px
            <input
              type="range"
              min={8}
              max={150}
              value={aiMaskBrushSize}
              onChange={(e) => applyAiMaskBrushSize(Number(e.target.value))}
              className="accent-[#6366F1]"
            />
          </label>

          <button
            type="button"
            onClick={() => engineRef.current?.clearAiMask()}
            className={`rounded border border-slate-700 px-2 py-1 text-xs ${INACTIVE_TEXT} hover:bg-slate-800`}
          >
            Clear mask
          </button>

          <label className={`flex flex-col gap-1 text-xs ${INACTIVE_TEXT}`}>
            Feather radius: {featherRadius}px
            <input
              type="range"
              min={0}
              max={30}
              value={featherRadius}
              onChange={(e) => setFeatherRadius(Number(e.target.value))}
              className="accent-[#6366F1]"
            />
          </label>

          <label className={`flex flex-col gap-1 text-xs ${INACTIVE_TEXT}`}>
            Prompt
            <textarea
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="e.g. Remove the man behind the two people in front…"
              className="resize-none rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-200"
            />
          </label>

          <button
            type="button"
            disabled={isGenerateBusy}
            onClick={async () => {
              const applied = await aiEdit.generate(aiPrompt, featherRadius);
              if (applied) {
                // Clear the prompt on success -- see useAiEdit.ts's
                // docstring for why leaving stale prompt text in this
                // field was the real root cause of "AI Edit reuses the
                // previous instruction" (Sprint 3 regression). On
                // error, deliberately leave it untouched so the user
                // can retry without retyping.
                setAiPrompt("");
              }
            }}
            className="relative overflow-hidden rounded bg-[#6366F1] px-2 py-1.5 text-xs font-medium text-white transition hover:bg-[#5457e0] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {aiEdit.status === "preparing" && "Preparing…"}
            {aiEdit.status === "uploading" && "Uploading…"}
            {aiEdit.status === "queued" && "Queued…"}
            {aiEdit.status === "generating" && "Generating…"}
            {aiEdit.status === "processing-result" && "Finishing…"}
            {(aiEdit.status === "idle" || aiEdit.status === "success" || aiEdit.status === "error") && "Generate"}
          </button>

          {aiEdit.status === "error" && aiEdit.error && (
            <p className="rounded bg-red-950/60 px-2 py-1.5 text-[11px] text-red-300" role="alert">
              {aiEdit.error}
            </p>
          )}
          {aiEdit.status === "success" && (
            <p className="rounded bg-emerald-950/60 px-2 py-1.5 text-[11px] text-emerald-300">
              Applied! You can undo this like any other edit.
            </p>
          )}
        </div>
      )}
    </aside>
  );
}
