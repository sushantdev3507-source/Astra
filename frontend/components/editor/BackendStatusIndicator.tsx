"use client";

import { useEditor } from "@/lib/editor/EditorProvider";
import { useAiEditContext } from "@/lib/editor/AiEditContext";
import { useAiProviderStatus } from "@/lib/hooks/useAiProviderStatus";

const AI_BUSY_STATES = new Set(["preparing", "uploading", "queued", "generating", "processing-result"]);

/**
 * Three DISTINCT signals, per Sprint 4 Track B §22 -- deliberately not
 * collapsed into one dot, since "backend reachable" does NOT imply
 * "AI is actually usable" (e.g. AI_PROVIDER=real with no credential
 * configured is a real, common misconfiguration state that must be
 * visible, not hidden behind a green backend dot).
 */
export function BackendStatusIndicator() {
  const { state } = useEditor();
  const aiEdit = useAiEditContext();
  const aiStatus = useAiProviderStatus();

  const isAiBusy = AI_BUSY_STATES.has(aiEdit.status);

  return (
    <div className="flex items-center gap-3 text-xs">
      {state.backendOnline === null && (
        <span className="flex items-center gap-1.5 text-slate-400">
          <span className="h-2 w-2 animate-pulse rounded-full bg-slate-500" />
          Checking backend…
        </span>
      )}
      {state.backendOnline === true && (
        <span className="flex items-center gap-1.5 text-emerald-400">
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          Backend Active
        </span>
      )}
      {state.backendOnline === false && (
        <span className="flex items-center gap-1.5 text-red-400">
          <span className="h-2 w-2 rounded-full bg-red-400" />
          Backend Offline
        </span>
      )}

      {aiStatus && (
        <span
          className={[
            "flex items-center gap-1.5",
            aiStatus.provider === "real" && aiStatus.configured
              ? "text-[#38BDF8]"
              : aiStatus.provider === "real"
                ? "text-amber-400"
                : "text-slate-400",
          ].join(" ")}
          title={
            aiStatus.provider === "real"
              ? aiStatus.configured
                ? `Real AI provider active (${aiStatus.model ?? "configured"})`
                : "AI_PROVIDER=real is set, but no credential is configured -- see README.md"
              : "Using the deterministic mock AI provider"
          }
        >
          <span
            className={[
              "h-2 w-2 rounded-full",
              aiStatus.provider === "real" && aiStatus.configured
                ? "bg-[#38BDF8]"
                : aiStatus.provider === "real"
                  ? "bg-amber-400"
                  : "bg-slate-500",
            ].join(" ")}
          />
          {aiStatus.provider === "real"
            ? aiStatus.configured
              ? "Real AI"
              : "Real AI (not configured)"
            : "Mock AI"}
        </span>
      )}

      {isAiBusy && (
        <span className="flex items-center gap-1.5 text-[#6366F1]">
          <span className="h-2 w-2 animate-pulse rounded-full bg-[#6366F1]" />
          AI job processing
        </span>
      )}
    </div>
  );
}
