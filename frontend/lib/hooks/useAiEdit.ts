"use client";

import { useCallback, useRef, useState } from "react";
import { useCanvasEngine } from "@/lib/editor/EngineContext";
import { requestInpaint, type InpaintProgress } from "@/lib/ai/inpaintClient";
import { ApiError, getApiBaseUrl } from "@/lib/api/client";
import { clearActiveAiJob, setActiveAiJob } from "@/lib/persistence/sessionStore";

/**
 * Full status vocabulary requested by Sprint 4 Track A §10: Preparing,
 * Uploading, Queued, Generating, Processing result, Complete, Failed.
 * ("preparing" covers the brief client-side canvas-export step before
 * anything is even sent to the network.)
 */
export type AiGenerationStatus =
  | "idle"
  | "preparing"
  | "uploading"
  | "queued"
  | "generating"
  | "processing-result"
  | "success"
  | "error";

function resolveResultUrl(url: string): string {
  return url.startsWith("http") ? url : `${getApiBaseUrl()}${url}`;
}

interface UseAiEditReturn {
  status: AiGenerationStatus;
  error: string | null;
  /** Resolves true if the result was applied, false otherwise (validation failure, API error, or superseded by a newer call). */
  generate: (prompt: string, featherRadius?: number) => Promise<boolean>;
  reset: () => void;
}

/**
 * Owns the network/lifecycle side of AI Edit. The engine itself has
 * zero networking code (see html-tool/README.md) -- this hook is
 * where Astra's own REST calls to its own backend happen. On failure,
 * the mask and prompt are left completely untouched so the user can
 * just press Generate again without repainting.
 *
 * Sprint 4: the backend moved from a synchronous inpaint call to an
 * async job (POST creates a job, GET polls its status) so a slow real
 * AI model never blocks the HTTP request. requestInpaint() handles the
 * create+poll cycle and reports fine-grained progress via onProgress,
 * which this hook maps onto the UI-facing status states above.
 */
export function useAiEdit(): UseAiEditReturn {
  const engineRef = useCanvasEngine();
  const [status, setStatus] = useState<AiGenerationStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const isGeneratingRef = useRef(false); // guards against duplicate concurrent generations
  const generationIdRef = useRef(0); // increments per call; guards against a stale response being applied

  const reset = useCallback(() => {
    setStatus("idle");
    setError(null);
  }, []);

  const generate = useCallback(
    async (prompt: string, featherRadius?: number): Promise<boolean> => {
      const engine = engineRef.current;
      if (!engine || isGeneratingRef.current) return false;

      const trimmed = prompt.trim();
      if (!trimmed) {
        setStatus("error");
        setError("Enter a prompt describing the edit.");
        return false;
      }
      // Mask is now OPTIONAL (Gemini Integration Sprint) -- a user can
      // give an instruction with no painted region ("remove the man
      // behind the two people") and providers that support
      // instruction-only editing (Gemini, the mock) will attempt it
      // using image+prompt alone. Providers that architecturally
      // require a mask (traditional inpainting models) reject a
      // maskless request with a clear error from the backend itself --
      // deciding that here would require an extra round-trip and
      // duplicate the backend's own source-of-truth logic.

      generationIdRef.current += 1;
      const thisGenerationId = generationIdRef.current;
      const stillCurrent = () => thisGenerationId === generationIdRef.current;

      isGeneratingRef.current = true;
      setStatus("preparing");
      setError(null);

      try {
        // Fresh export EVERY call -- never reused/cached across
        // generations, so this always reflects the CURRENT mask
        // (region B, not region A, or no mask at all) and the CURRENT
        // image (including any prior AI result already applied).
        const hasMask = engine.hasAiMaskContent();
        const [imageBlob, maskBlob] = await Promise.all([
          engine.exportBaseImageForAi(),
          hasMask ? engine.exportAiMaskBlob() : Promise.resolve(null),
        ]);
        if (!stillCurrent()) return false;

        const onProgress = (stage: InpaintProgress) => {
          if (!stillCurrent()) return;
          setStatus(stage);
        };
        // Sprint 4 Track D: record the job as "in flight" for THIS
        // session as soon as it exists, so a refresh mid-generation
        // can detect it on recovery instead of silently losing track.
        const onJobCreated = (jobId: string) => {
          void setActiveAiJob(jobId, trimmed);
        };

        const result = await requestInpaint(
          imageBlob,
          maskBlob,
          trimmed,
          featherRadius,
          onProgress,
          onJobCreated
        );
        void clearActiveAiJob(); // reached a terminal state -- no longer "in flight"

        // Discard this response if a NEWER generate() call has started
        // since this one began (out-of-order network responses).
        if (!stillCurrent()) return false;

        if (!result.success || !result.url) {
          setStatus("error");
          setError(result.error ?? "AI generation failed.");
          return false;
        }

        await engine.applyAiResult(resolveResultUrl(result.url));
        if (!stillCurrent()) return false; // superseded mid-apply
        setStatus("success");
        return true;
      } catch (err) {
        void clearActiveAiJob();
        if (!stillCurrent()) return false;
        setStatus("error");
        setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
        return false;
      } finally {
        isGeneratingRef.current = false;
      }
    },
    [engineRef]
  );

  return { status, error, generate, reset };
}
