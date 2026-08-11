"use client";

import { useEffect, useState } from "react";
import { useEditor } from "@/lib/editor/EditorProvider";
import { useCanvasEngine } from "@/lib/editor/EngineContext";
import { clearSession, clearActiveAiJob, loadSession, type PersistedSession } from "@/lib/persistence/sessionStore";
import { checkJobStatusOnce } from "@/lib/ai/inpaintClient";
import { getApiBaseUrl } from "@/lib/api/client";
import type { CanvasSnapshot, PageRecord } from "@/lib/editor/types";

function timeAgo(epochMs: number): string {
  const seconds = Math.max(0, Math.round((Date.now() - epochMs) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.round(minutes / 60);
  return `${hours} hour${hours === 1 ? "" : "s"} ago`;
}

function resolveResultUrl(url: string): string {
  return url.startsWith("http") ? url : `${getApiBaseUrl()}${url}`;
}

/**
 * Shown once, on initial editor load, when a previous editing session
 * was found in IndexedDB (Sprint 3). Never fires if the user is
 * already loading something (local upload in progress or an external
 * 5onam.ai launch reference) -- see EditorShell.tsx, which only
 * mounts this when there's no other asset already being set up.
 *
 * Sprint 4 Track D: if that session had an AI job still in flight when
 * it was last saved, restoring the session also checks (ONCE, never
 * resubmitting) what happened to that job -- applies it if it finished
 * successfully while we were away, otherwise just clears the stale
 * reference. See useAiEdit.ts for where the job id gets recorded.
 */
export function SessionRecoveryPrompt() {
  const { state, dispatch } = useEditor();
  const engineRef = useCanvasEngine();
  const [found, setFound] = useState<PersistedSession | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [resumeNote, setResumeNote] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadSession().then((session) => {
      if (!cancelled && session) setFound(session);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function resolveActiveJob(jobId: string) {
    const status = await checkJobStatusOnce(jobId);
    await clearActiveAiJob(); // one-shot check only -- never resume polling, never resubmit

    if (!status) return; // couldn't reach the backend to check; nothing more we can safely do

    if (status.status === "completed" && status.result?.url) {
      // Wait briefly for the engine to exist (Canvas.tsx creates it
      // once the asset is set, which just happened via handleRestore).
      for (let i = 0; i < 20 && !engineRef.current; i++) {
        await new Promise((r) => setTimeout(r, 150));
      }
      if (engineRef.current) {
        await engineRef.current.applyAiResult(resolveResultUrl(status.result.url));
        setResumeNote("Your AI edit finished while you were away -- it's been applied.");
      }
    } else if (status.status === "queued" || status.status === "processing") {
      setResumeNote(
        "An AI edit was still running when you left. It may still be processing on the server -- try Generate again if you don't see a result."
      );
    }
    // failed / not found: nothing to show, mask+prompt weren't recoverable anyway.
  }

  if (!found || dismissed || state.asset) {
    // Even after the main prompt is dismissed, a resume note (from an
    // AI job that finished while we were away) should still show.
    if (resumeNote) {
      return (
        <div className="absolute inset-x-0 top-0 z-20 flex justify-center p-4">
          <div className="flex items-center gap-3 rounded-lg border border-[#38BDF8]/50 bg-slate-900/95 px-4 py-2.5 text-sm text-slate-100 shadow-xl backdrop-blur-md">
            {resumeNote}
            <button
              type="button"
              onClick={() => setResumeNote(null)}
              className="text-slate-400 hover:text-slate-200"
              aria-label="Dismiss"
            >
              ×
            </button>
          </div>
        </div>
      );
    }
    return null;
  }

  function handleRestore() {
    if (!found) return;
    if (found.pages && found.pageOrder && found.activePageId) {
      // Multi-page session (Sprint 5) -- restore the full page set in
      // one shot via the same generic mechanism as a single-page
      // restore (page/restoreAll sets pendingRestoreDocument the same
      // way loadPageIntoMirror does for a live page switch).
      dispatch({
        type: "page/restoreAll",
        pages: found.pages as Record<string, PageRecord>,
        pageOrder: found.pageOrder,
        activePageId: found.activePageId,
      });
    } else {
      // Pre-multi-page session -- reconstruct a single page from the
      // legacy top-level fields.
      dispatch({
        type: "asset/set",
        asset: {
          id: found.assetId,
          type: "image",
          name: found.assetName,
          mimeType: "image/png",
          url: found.assetUrl,
        },
        restoreDocument: found.document as CanvasSnapshot,
      });
    }
    if (found.activeAiJobId) {
      void resolveActiveJob(found.activeAiJobId);
    }
    setDismissed(true);
  }

  function handleDiscard() {
    clearSession();
    setDismissed(true);
  }

  return (
    <div className="absolute inset-x-0 top-0 z-20 flex justify-center p-4">
      <div className="flex items-center gap-4 rounded-lg border border-[#6366F1]/50 bg-slate-900/95 px-4 py-3 shadow-xl backdrop-blur-md">
        <div>
          <p className="text-sm font-medium text-slate-100">Restore previous session?</p>
          <p className="text-xs text-slate-400">
            &quot;{found.assetName}&quot; saved {timeAgo(found.savedAt)}
            {found.activeAiJobId && " — an AI edit was in progress"}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleRestore}
            className="rounded-md bg-[#6366F1] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#5457e0]"
          >
            Restore
          </button>
          <button
            type="button"
            onClick={handleDiscard}
            className="rounded-md border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800"
          >
            Discard
          </button>
        </div>
      </div>
    </div>
  );
}
