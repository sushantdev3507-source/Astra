"use client";

import { createContext, useContext, useMemo, useReducer, ReactNode, Dispatch } from "react";
import { editorReducer, EditorAction } from "./reducer";
import { EditorState, initialEditorState } from "./types";

interface EditorContextValue {
  state: EditorState;
  dispatch: Dispatch<EditorAction>;
}

const EditorContext = createContext<EditorContextValue | null>(null);

export function EditorProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(editorReducer, initialEditorState);
  const value = useMemo(() => ({ state, dispatch }), [state]);
  return <EditorContext.Provider value={value}>{children}</EditorContext.Provider>;
}

export function useEditor(): EditorContextValue {
  const ctx = useContext(EditorContext);
  if (!ctx) {
    throw new Error("useEditor must be used within an EditorProvider");
  }
  return ctx;
}
