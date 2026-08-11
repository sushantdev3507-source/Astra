/**
 * Pure decision logic for whether a historyIndex change should trigger
 * engine.restoreState(). Extracted from Canvas.tsx specifically so it
 * can be unit-tested without any DOM/canvas machinery -- the bug this
 * guards against (Sprint 3 regression: eraser wiping the whole
 * drawing on an unrelated click) was a pure control-flow/timing issue,
 * not a rendering issue, so a pure-logic test is the right level to
 * pin it down at.
 *
 * The rule: restoreState() must be called for a GENUINE external
 * history change (undo, redo, an applied session restore) and must
 * NOT be called when the change is simply the engine reporting its
 * own just-completed commit -- the engine's internal state already
 * matches state.canvas in that case, and calling restoreState() would
 * needlessly (and, for the drawing layer specifically, dangerously --
 * see engine.ts's syncLayerCanvasFromDoc) reset and re-decode scratch
 * canvases that are already correct.
 */
export interface HistorySyncState {
  lastSyncedHistoryIndex: number;
  selfCommitPending: boolean;
}

export interface HistorySyncDecision {
  shouldRestore: boolean;
  nextState: HistorySyncState;
}

export function decideHistorySync(
  state: HistorySyncState,
  newHistoryIndex: number
): HistorySyncDecision {
  if (state.lastSyncedHistoryIndex === newHistoryIndex) {
    // No change at all -- nothing to do, flag (if any) stays as-is.
    return { shouldRestore: false, nextState: state };
  }

  if (state.selfCommitPending) {
    // This history change is the engine reporting its own commit --
    // consume the flag, do NOT call restoreState().
    return {
      shouldRestore: false,
      nextState: { lastSyncedHistoryIndex: newHistoryIndex, selfCommitPending: false },
    };
  }

  // A genuine external change (undo/redo/restore) -- must sync.
  return {
    shouldRestore: true,
    nextState: { lastSyncedHistoryIndex: newHistoryIndex, selfCommitPending: false },
  };
}
