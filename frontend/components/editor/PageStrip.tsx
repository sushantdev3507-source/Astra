"use client";

import { useState } from "react";
import { Plus, Copy, X, Pencil } from "lucide-react";
import { useEditor } from "@/lib/editor/EditorProvider";

/**
 * Page navigation strip (Sprint 5 foundation). Only rendered once an
 * asset/page exists -- a single-page project looks identical to
 * before multi-page existed (one tab, nothing else visibly different).
 */
export function PageStrip() {
  const { state, dispatch } = useEditor();
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  if (state.pageOrder.length === 0) return null;

  function startRename(pageId: string, currentName: string) {
    setRenamingId(pageId);
    setRenameValue(currentName);
  }

  function commitRename() {
    if (renamingId && renameValue.trim()) {
      dispatch({ type: "page/rename", pageId: renamingId, name: renameValue.trim() });
    }
    setRenamingId(null);
  }

  return (
    <div className="flex h-11 shrink-0 items-center gap-1 overflow-x-auto border-b border-slate-700/50 bg-slate-900/60 px-2 backdrop-blur-md">
      {state.pageOrder.map((pageId) => {
        const p = state.pages[pageId];
        if (!p) return null;
        const isActive = pageId === state.activePageId;
        return (
          <div
            key={pageId}
            className={[
              "group flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs transition",
              isActive ? "bg-[#6366F1] text-white" : "text-[#94A3B8] hover:bg-slate-800/70 hover:text-slate-100",
            ].join(" ")}
          >
            {renamingId === pageId ? (
              <input
                autoFocus
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onBlur={commitRename}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitRename();
                  if (e.key === "Escape") setRenamingId(null);
                }}
                className="w-20 rounded bg-slate-950 px-1 text-xs text-slate-100 outline-none"
              />
            ) : (
              <button
                type="button"
                onClick={() => dispatch({ type: "page/switchTo", pageId })}
                onDoubleClick={() => startRename(pageId, p.name)}
                className="whitespace-nowrap"
                title="Double-click to rename"
              >
                {p.name}
              </button>
            )}

            {isActive && (
              <span className="hidden items-center gap-0.5 group-hover:flex">
                <button
                  type="button"
                  onClick={() => startRename(pageId, p.name)}
                  title="Rename"
                  className="rounded p-0.5 hover:bg-white/20"
                >
                  <Pencil size={11} />
                </button>
                <button
                  type="button"
                  onClick={() => dispatch({ type: "page/duplicate", pageId })}
                  title="Duplicate page"
                  className="rounded p-0.5 hover:bg-white/20"
                >
                  <Copy size={11} />
                </button>
                {state.pageOrder.length > 1 && (
                  <button
                    type="button"
                    onClick={() => dispatch({ type: "page/delete", pageId })}
                    title="Delete page"
                    className="rounded p-0.5 hover:bg-white/20"
                  >
                    <X size={11} />
                  </button>
                )}
              </span>
            )}
          </div>
        );
      })}

      <button
        type="button"
        onClick={() => dispatch({ type: "page/create" })}
        title="Add page"
        className="flex shrink-0 items-center gap-1 rounded-md px-2 py-1.5 text-xs text-[#94A3B8] hover:bg-slate-800/70 hover:text-slate-100"
      >
        <Plus size={13} />
      </button>
    </div>
  );
}
