"use client";

import { useEffect } from "react";
import { checkBackendHealth } from "@/lib/api/health";
import { useEditor } from "@/lib/editor/EditorProvider";

const POLL_INTERVAL_MS = 15000;

/** Keeps editor state's backendOnline flag fresh via periodic polling. */
export function useBackendHealth() {
  const { dispatch } = useEditor();

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      const online = await checkBackendHealth();
      if (!cancelled) {
        dispatch({ type: "backend/status", online });
      }
    }

    poll();
    const interval = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [dispatch]);
}
