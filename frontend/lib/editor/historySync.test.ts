/**
 * Regression tests for the Sprint 3 fix: "eraser wipes the entire
 * drawing when clicking an empty area right after erasing over
 * something." Root cause was Canvas.tsx calling engine.restoreState()
 * after the engine's OWN commits, not just genuine undo/redo -- see
 * historySync.ts and Canvas.tsx for the full explanation.
 *
 * Pure logic, no DOM/canvas required -- run with:
 *   npx tsx lib/editor/historySync.test.ts
 */
import { decideHistorySync, type HistorySyncState } from "./historySync";

let failures = 0;

function assertEqual<T>(actual: T, expected: T, message: string) {
  const pass = JSON.stringify(actual) === JSON.stringify(expected);
  if (!pass) {
    failures += 1;
    console.error(`FAIL: ${message}\n  expected: ${JSON.stringify(expected)}\n  actual:   ${JSON.stringify(actual)}`);
  } else {
    console.log(`PASS: ${message}`);
  }
}

// --- Scenario: a self-originated commit (draw/erase stroke) must NOT trigger restoreState ---
{
  const state: HistorySyncState = { lastSyncedHistoryIndex: 0, selfCommitPending: false };

  // Simulate: user erases over drawing -> engine.onCommit fires -> Canvas.tsx
  // sets selfCommitPendingRef.current = true (mirrored here) -> historyIndex becomes 1.
  const afterFirstErase: HistorySyncState = { ...state, selfCommitPending: true };
  const decision1 = decideHistorySync(afterFirstErase, 1);
  assertEqual(decision1.shouldRestore, false, "self-commit (erase #1) does NOT trigger restoreState");
  assertEqual(
    decision1.nextState,
    { lastSyncedHistoryIndex: 1, selfCommitPending: false },
    "self-commit consumes the pending flag and advances lastSyncedHistoryIndex"
  );

  // Immediately after: user clicks an empty area with the eraser still
  // selected -> ANOTHER self-commit -> historyIndex becomes 2. This is
  // the exact second interaction from the bug report.
  const beforeSecondErase: HistorySyncState = { ...decision1.nextState, selfCommitPending: true };
  const decision2 = decideHistorySync(beforeSecondErase, 2);
  assertEqual(decision2.shouldRestore, false, "self-commit (empty-area click) ALSO does NOT trigger restoreState");
}

// --- Scenario: undo/redo (selfCommitPending stays false) MUST trigger restoreState ---
{
  const afterSomeEdits: HistorySyncState = { lastSyncedHistoryIndex: 3, selfCommitPending: false };

  // Undo: historyIndex goes down, selfCommitPending was never set (undo
  // doesn't go through onCommit).
  const undoDecision = decideHistorySync(afterSomeEdits, 2);
  assertEqual(undoDecision.shouldRestore, true, "undo (external change) DOES trigger restoreState");

  const afterUndo = undoDecision.nextState;
  const redoDecision = decideHistorySync(afterUndo, 3);
  assertEqual(redoDecision.shouldRestore, true, "redo (external change) DOES trigger restoreState");
}

// --- Scenario: no actual change -> no-op regardless of the flag ---
{
  const state: HistorySyncState = { lastSyncedHistoryIndex: 5, selfCommitPending: false };
  const decision = decideHistorySync(state, 5);
  assertEqual(decision.shouldRestore, false, "unchanged historyIndex is always a no-op");
  assertEqual(decision.nextState, state, "no-op leaves state untouched");
}

// --- Scenario: interleaved self-commit then undo (realistic session) ---
{
  let state: HistorySyncState = { lastSyncedHistoryIndex: 0, selfCommitPending: false };

  // Draw a stroke (self-commit) -> index 1
  state = { ...state, selfCommitPending: true };
  let d = decideHistorySync(state, 1);
  assertEqual(d.shouldRestore, false, "interleaved: draw stroke does not restore");
  state = d.nextState;

  // User clicks Undo (external) -> index 0
  d = decideHistorySync(state, 0);
  assertEqual(d.shouldRestore, true, "interleaved: undo after a draw DOES restore");
  state = d.nextState;

  // User draws again (self-commit) -> index 1
  state = { ...state, selfCommitPending: true };
  d = decideHistorySync(state, 1);
  assertEqual(d.shouldRestore, false, "interleaved: drawing again after undo does not restore");
}

if (failures > 0) {
  console.error(`\n${failures} check(s) FAILED.`);
  process.exitCode = 1;
} else {
  console.log("\nAll history-sync checks passed.");
}
