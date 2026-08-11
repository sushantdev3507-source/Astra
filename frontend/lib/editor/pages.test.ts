/**
 * Regression tests for Sprint 5's multi-page document model. Pure
 * reducer logic, no DOM/canvas required -- run with:
 *   npx tsx lib/editor/pages.test.ts
 *
 * Covers the testing requirements list items 9-12 (page creation,
 * deletion, switching, duplication, persistence-shape). Eraser,
 * undo/redo, and sequential-AI-edit regressions are already covered
 * by historySync.test.ts and the backend's test_inpaint.py -- not
 * duplicated here.
 */
import { editorReducer } from "./reducer";
import { initialEditorState } from "./types";
import type { Asset } from "@/lib/types/asset";

let failures = 0;
function assert(cond: boolean, message: string) {
  if (!cond) {
    failures += 1;
    console.error(`FAIL: ${message}`);
  } else {
    console.log(`PASS: ${message}`);
  }
}

const fakeAsset = (id: string, name: string): Asset => ({
  id,
  type: "image",
  name,
  mimeType: "image/png",
  url: `/api/v1/assets/${id}/file`,
});

// --- Page creation ---
{
  let state = initialEditorState;
  assert(state.pageOrder.length === 1, "starts with exactly one page");

  state = editorReducer(state, { type: "page/create" });
  assert(state.pageOrder.length === 2, "page/create adds a second page");
  assert(state.activePageId === state.pageOrder[1], "page/create switches to the new page");
  assert(state.asset === null, "new page starts with no asset");
}

// --- Independent per-page asset/canvas, verified via switching ---
{
  let state = initialEditorState;
  const page1Id = state.activePageId;

  // Set an asset on page 1.
  state = editorReducer(state, { type: "asset/set", asset: fakeAsset("a1", "img1.png") });
  assert(state.asset?.id === "a1", "page 1 has its asset set");

  // Create page 2, set a DIFFERENT asset there.
  state = editorReducer(state, { type: "page/create" });
  const page2Id = state.activePageId;
  state = editorReducer(state, { type: "asset/set", asset: fakeAsset("a2", "img2.png") });
  assert(state.asset?.id === "a2", "page 2 has its own, different asset");
  assert(page1Id !== page2Id, "page 1 and page 2 have different ids");

  // Switch back to page 1 -- must show page 1's asset, not page 2's.
  state = editorReducer(state, { type: "page/switchTo", pageId: page1Id });
  assert(state.asset?.id === "a1", "switching back to page 1 restores ITS asset (not page 2's)");
  assert(state.activePageId === page1Id, "activePageId updated correctly");

  // Switch to page 2 again -- must still show page 2's asset.
  state = editorReducer(state, { type: "page/switchTo", pageId: page2Id });
  assert(state.asset?.id === "a2", "switching to page 2 again shows ITS asset, not stale page 1 data");

  // The pages record itself must also hold both assets independently.
  assert(state.pages[page1Id]?.asset?.id === "a1", "pages record: page 1 entry has its own asset");
  assert(state.pages[page2Id]?.asset?.id === "a2", "pages record: page 2 entry has its own asset");
}

// --- Duplicate ---
{
  let state = initialEditorState;
  const page1Id = state.activePageId;
  state = editorReducer(state, { type: "asset/set", asset: fakeAsset("a1", "img1.png") });

  state = editorReducer(state, { type: "page/duplicate", pageId: page1Id });
  assert(state.pageOrder.length === 2, "duplicate adds a page");
  assert(state.activePageId === page1Id, "duplicate does NOT switch away from the current page");

  const dupId = state.pageOrder[1];
  assert(state.pages[dupId]?.asset?.id === "a1", "the duplicate has a copy of the source page's asset");
  assert(state.pages[dupId]?.name.includes("copy"), "the duplicate gets a distinguishing name");
}

// --- Delete ---
{
  let state = initialEditorState;
  const page1Id = state.activePageId;
  state = editorReducer(state, { type: "page/create" });
  const page2Id = state.activePageId;

  // Deleting a NON-active page: active page stays the same.
  state = editorReducer(state, { type: "page/switchTo", pageId: page1Id });
  state = editorReducer(state, { type: "page/delete", pageId: page2Id });
  assert(state.pageOrder.length === 1, "deleting page 2 leaves one page");
  assert(state.activePageId === page1Id, "deleting a non-active page doesn't change the active page");

  // Cannot delete the last remaining page.
  const beforeCount = state.pageOrder.length;
  state = editorReducer(state, { type: "page/delete", pageId: page1Id });
  assert(state.pageOrder.length === beforeCount, "deleting the LAST page is a no-op (always keep at least one)");
}

{
  // Deleting the ACTIVE page falls back to an adjacent page.
  let state = initialEditorState;
  const page1Id = state.activePageId;
  state = editorReducer(state, { type: "page/create" }); // page 2, now active
  const page2Id = state.activePageId;
  state = editorReducer(state, { type: "page/create" }); // page 3, now active
  const page3Id = state.activePageId;

  state = editorReducer(state, { type: "page/switchTo", pageId: page2Id });
  state = editorReducer(state, { type: "page/delete", pageId: page2Id }); // delete the ACTIVE page
  assert(state.pageOrder.length === 2, "deleting the active page removes it");
  assert(state.activePageId !== page2Id, "active page id changed after deleting the active page");
  assert(
    state.activePageId === page1Id || state.activePageId === page3Id,
    "falls back to an adjacent remaining page"
  );
}

// --- Reorder ---
{
  let state = initialEditorState;
  const page1Id = state.activePageId;
  state = editorReducer(state, { type: "page/create" });
  const page2Id = state.activePageId;
  state = editorReducer(state, { type: "page/create" });
  const page3Id = state.activePageId;

  assert(
    state.pageOrder.join(",") === [page1Id, page2Id, page3Id].join(","),
    "initial order is creation order"
  );
  state = editorReducer(state, { type: "page/reorder", pageId: page1Id, toIndex: 2 });
  assert(
    state.pageOrder.join(",") === [page2Id, page3Id, page1Id].join(","),
    "reorder moves the page to the requested position"
  );
}

// --- Restore-all (IndexedDB session recovery shape) ---
{
  let state = initialEditorState;
  const restoredPages = {
    p1: { id: "p1", name: "Page 1", asset: fakeAsset("a1", "one.png"), canvas: initialEditorState.canvas, history: [initialEditorState.canvas], historyIndex: 0 },
    p2: { id: "p2", name: "Page 2", asset: fakeAsset("a2", "two.png"), canvas: initialEditorState.canvas, history: [initialEditorState.canvas], historyIndex: 0 },
  };
  state = editorReducer(state, {
    type: "page/restoreAll",
    pages: restoredPages,
    pageOrder: ["p1", "p2"],
    activePageId: "p2",
  });
  assert(state.pageOrder.length === 2, "restoreAll loads both pages");
  assert(state.activePageId === "p2", "restoreAll sets the correct active page");
  assert(state.asset?.id === "a2", "restoreAll's top-level mirror reflects the active page");
  assert(state.pages["p1"]?.asset?.id === "a1", "restoreAll preserves the non-active page's data too");
}

if (failures > 0) {
  console.error(`\n${failures} check(s) FAILED.`);
  process.exitCode = 1;
} else {
  console.log("\nAll multi-page checks passed.");
}
