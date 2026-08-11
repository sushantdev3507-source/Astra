"use client";

import { useEffect, useMemo, useRef } from "react";
import { EditorProvider, useEditor } from "@/lib/editor/EditorProvider";
import { EngineProvider } from "@/lib/editor/EngineContext";
import { AiEditProvider } from "@/lib/editor/AiEditContext";
import { useBackendHealth } from "@/lib/hooks/useBackendHealth";
import { useKeyboardShortcuts } from "@/lib/hooks/useKeyboardShortcuts";
import { useSessionAutosave } from "@/lib/hooks/useSessionAutosave";
import { parseLaunchContext } from "@/lib/integration/launchContext";
import { resolveLaunchAsset } from "@/lib/integration/resolveAsset";
import { Header } from "./Header";
import { Toolbar } from "./Toolbar";
import { Canvas } from "./Canvas";
import { PropertiesPanel } from "./PropertiesPanel";
import { StatusBar } from "./StatusBar";
import { SessionRecoveryPrompt } from "./SessionRecoveryPrompt";
import { PageStrip } from "./PageStrip";

interface EditorShellProps {
  /** Query params from the /editor route -- may carry an external 5onam.ai launch reference. */
  initialSearchParams?: Record<string, string>;
}

function ExternalLaunchResolver({ initialSearchParams }: EditorShellProps) {
  const { dispatch } = useEditor();
  const resolvedRef = useRef(false);

  useEffect(() => {
    if (resolvedRef.current) return;
    if (!initialSearchParams) return;
    const params = new URLSearchParams(initialSearchParams);
    const context = parseLaunchContext(params);
    if (!context) return; // normal local-upload case, nothing to resolve

    resolvedRef.current = true;
    dispatch({ type: "upload/start" });
    resolveLaunchAsset(context)
      .then((asset) => dispatch({ type: "asset/set", asset }))
      .catch((err) => {
        dispatch({
          type: "upload/error",
          message: err instanceof Error ? err.message : "Could not load the referenced asset.",
        });
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSearchParams]);

  return null;
}

function EditorLayout({ initialSearchParams }: EditorShellProps) {
  useBackendHealth();
  useKeyboardShortcuts();
  useSessionAutosave();
  const { state } = useEditor();

  // Session recovery must never race an external (5onam.ai) launch --
  // "Do not silently overwrite a newly opened asset". If launch params
  // are present, the recovery prompt simply doesn't render at all.
  const hasLaunchParams = useMemo(() => {
    if (!initialSearchParams) return false;
    return Boolean(initialSearchParams.assetId || initialSearchParams.assetUrl);
  }, [initialSearchParams]);

  // A brand-new single-page project (nothing uploaded yet, no second
  // page created) looks identical to the pre-multi-page editor -- the
  // strip only appears once there's something to navigate between.
  const showPageStrip = Boolean(state.asset) || state.pageOrder.length > 1;

  return (
    <div className="flex h-dvh w-full flex-col bg-zinc-900">
      <ExternalLaunchResolver initialSearchParams={initialSearchParams} />
      <Header />
      {showPageStrip && <PageStrip />}
      <div className="relative flex min-h-0 flex-1">
        <Toolbar />
        <main className="relative min-w-0 flex-1">
          {!hasLaunchParams && <SessionRecoveryPrompt />}
          <Canvas />
        </main>
        <PropertiesPanel />
      </div>
      <StatusBar />
    </div>
  );
}

export function EditorShell({ initialSearchParams }: EditorShellProps) {
  return (
    <EditorProvider>
      <EngineProvider>
        <AiEditProvider>
          <EditorLayout initialSearchParams={initialSearchParams} />
        </AiEditProvider>
      </EngineProvider>
    </EditorProvider>
  );
}
