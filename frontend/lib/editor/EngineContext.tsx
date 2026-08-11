"use client";

import { createContext, useContext, useRef, ReactNode, MutableRefObject } from "react";
import { CanvasEngine } from "@/lib/canvas-engine";

interface EngineContextValue {
  engineRef: MutableRefObject<CanvasEngine | null>;
}

const EngineContext = createContext<EngineContextValue | null>(null);

export function EngineProvider({ children }: { children: ReactNode }) {
  const engineRef = useRef<CanvasEngine | null>(null);
  return <EngineContext.Provider value={{ engineRef }}>{children}</EngineContext.Provider>;
}

/**
 * Returns the shared CanvasEngine ref. The engine instance itself is
 * created/owned by the Canvas component; other components (Toolbar,
 * StatusBar, PropertiesPanel) read engineRef.current to call methods
 * directly, and should always guard for it being null (engine doesn't
 * exist until an asset is loaded).
 */
export function useCanvasEngine(): MutableRefObject<CanvasEngine | null> {
  const ctx = useContext(EngineContext);
  if (!ctx) {
    throw new Error("useCanvasEngine must be used within an EngineProvider");
  }
  return ctx.engineRef;
}
