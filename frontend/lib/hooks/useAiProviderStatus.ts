"use client";

import { useEffect, useState } from "react";
import { getAiProviderStatus, type AiProviderStatus } from "@/lib/ai/inpaintClient";

const POLL_INTERVAL_MS = 20000;

/** Distinct from backend reachability -- this is specifically "is real
 * AI actually configured, or are we running the mock". */
export function useAiProviderStatus(): AiProviderStatus | null {
  const [status, setStatus] = useState<AiProviderStatus | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const result = await getAiProviderStatus();
        if (!cancelled) setStatus(result);
      } catch {
        // Best-effort -- if this fails, we simply don't show AI provider info.
      }
    }

    poll();
    const interval = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return status;
}
