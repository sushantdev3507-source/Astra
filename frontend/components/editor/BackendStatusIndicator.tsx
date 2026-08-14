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

      {aiStatus && (() => {
        // BUG FIX: this used to special-case ONLY provider === "real"
        // (Replicate) -- Gemini and Pollinations both fell through to
        // the generic else-branch and displayed "Mock AI" even when
        // genuinely configured and active. Generalized to treat any
        // non-mock provider the same way, so this stays correct for
        // whichever provider AI_PROVIDER actually names, present or
        // future, without needing a new branch added here every time.
        const isRealProvider = aiStatus.provider !== "mock";
        const providerLabel =
          aiStatus.provider === "gemini"
            ? "Gemini"
            : aiStatus.provider === "pollinations"
              ? "Pollinations"
              : aiStatus.provider === "grok"
                ? "Grok"
                : aiStatus.provider === "real"
                  ? "Real AI"
                  : "Mock AI";
        const isActive = isRealProvider && aiStatus.configured;
        return (
          <span
            className={["flex items-center gap-1.5", isActive ? "text-[#38BDF8]" : isRealProvider ? "text-amber-400" : "text-slate-400"].join(" ")}
            title={
              isRealProvider
                ? aiStatus.configured
                  ? `${providerLabel} provider active${aiStatus.model ? ` (${aiStatus.model})` : ""}`
                  : `AI_PROVIDER=${aiStatus.provider} is set, but no credential is configured -- see README.md`
                : "Using the deterministic mock AI provider"
            }
          >
            <span
              className={["h-2 w-2 rounded-full", isActive ? "bg-[#38BDF8]" : isRealProvider ? "bg-amber-400" : "bg-slate-500"].join(" ")}
            />
            {isRealProvider ? (aiStatus.configured ? providerLabel : `${providerLabel} (not configured)`) : "Mock AI"}
          </span>
        );
      })()}

      {isAiBusy && (
        <span className="flex items-center gap-1.5 text-[#6366F1]">
          <span className="h-2 w-2 animate-pulse rounded-full bg-[#6366F1]" />
          AI job processing
        </span>
      )}
    </div>
  );
}
