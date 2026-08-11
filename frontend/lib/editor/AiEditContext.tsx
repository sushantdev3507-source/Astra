"use client";

import { createContext, useContext, ReactNode } from "react";
import { useAiEdit } from "@/lib/hooks/useAiEdit";

type AiEditContextValue = ReturnType<typeof useAiEdit>;

const AiEditContext = createContext<AiEditContextValue | null>(null);

/**
 * A single shared useAiEdit() instance for the whole editor. Without
 * this, Toolbar.tsx (which triggers generation) and Canvas.tsx (which
 * shows the generation overlay) would each get their OWN independent
 * hook state, and the overlay would never know a generation was
 * actually running.
 */
export function AiEditProvider({ children }: { children: ReactNode }) {
  const aiEdit = useAiEdit();
  return <AiEditContext.Provider value={aiEdit}>{children}</AiEditContext.Provider>;
}

export function useAiEditContext(): AiEditContextValue {
  const ctx = useContext(AiEditContext);
  if (!ctx) {
    throw new Error("useAiEditContext must be used within an AiEditProvider");
  }
  return ctx;
}
