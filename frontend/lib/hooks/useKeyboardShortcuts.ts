"use client";

import { useEffect } from "react";
import { useEditor } from "@/lib/editor/EditorProvider";
import { useCanvasEngine } from "@/lib/editor/EngineContext";
import type { ToolId } from "@/lib/canvas-engine";

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName.toLowerCase();
  return tag === "input" || tag === "textarea" || target.isContentEditable;
}

/** Single-key tool shortcuts (Sprint 4 Track B §17). No modifier keys,
 * so they never conflict with Ctrl/Cmd+Z etc. -- and never fire while
 * typing in a text field (see isTypingTarget above). */
const TOOL_SHORTCUTS: Record<string, ToolId> = {
  v: "select",
  b: "draw",
  e: "eraser",
  t: "text",
  s: "shape",
  c: "crop",
  i: "eyedropper",
  m: "ai-edit",
};

export function useKeyboardShortcuts() {
  const { state, dispatch } = useEditor();
  const engineRef = useCanvasEngine();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (isTypingTarget(e.target)) return;

      const isMod = e.metaKey || e.ctrlKey;

      if (isMod && e.key.toLowerCase() === "z" && e.shiftKey) {
        e.preventDefault();
        dispatch({ type: "history/redo" });
        return;
      }
      if (isMod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        dispatch({ type: "history/undo" });
        return;
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        engineRef.current?.deleteSelected();
        return;
      }
      if (e.key === "Escape") {
        engineRef.current?.deselect();
        return;
      }
      if (!isMod && !e.altKey && state.asset) {
        const tool = TOOL_SHORTCUTS[e.key.toLowerCase()];
        if (tool) {
          e.preventDefault();
          dispatch({ type: "tool/set", tool });
          engineRef.current?.setTool(tool);
        }
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [dispatch, engineRef, state.asset]);
}
