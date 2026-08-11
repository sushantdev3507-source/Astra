# html-tool

The standalone HTML5 Canvas editing engine at the core of Astra. No React,
no Next.js, no third-party canvas/editor library — just the Canvas API.

This module knows nothing about Astra's UI, routing, or backend. It only
knows how to render and edit a serializable `EditorDocument` on a
`<canvas>` element you give it.

## Public interface (`CanvasEngine`)

```ts
const engine = new CanvasEngine();

engine.initialize(canvasElement, {
  onCommit: (doc) => { /* push doc into your own undo/redo history */ },
  onSelectionChange: (objectId) => { /* update your UI */ },
});

await engine.loadImage(url);

engine.setTool("draw" | "eraser" | "text" | "shape" | "crop" | "select");
engine.setBrushOptions({ color, size });
engine.setShapeStyle({ shapeKind, fill, stroke, strokeWidth });

engine.addTextAt(sourceX, sourceY);
engine.updateSelectedObject({ text, fontSize, color, bold, italic, ... });
engine.deleteSelected();

engine.applyCrop();
engine.cancelCrop();
engine.clearCrop();

engine.setZoom(1.5);
engine.resetView();

const doc = engine.getState();      // serializable snapshot
engine.restoreState(doc);           // used by the host app's undo/redo

const blob = await engine.exportToBlob("image/png" | "image/jpeg");

engine.destroy();
```

## Design notes

- **Undo/redo lives in the host app, not here.** The engine calls
  `onCommit(doc)` once per *completed* action (a finished drag, a
  finished stroke, a finished crop) — never per `pointermove`. The host
  app (Astra's existing reducer from Sprint 1) is responsible for
  pushing that into history and calling `restoreState()` on undo/redo.
- **Coordinates are always source-image pixels** inside the engine and
  in the `EditorDocument`. Screen/viewport pixels only exist at the
  pointer-event boundary (`toSourceCoords`).
- **The drawing/eraser layer is a raster layer**, separate from the
  base image, so erasing never touches the original source pixels.
  Draw and erase strokes are rasterized into this layer on pointer-up;
  fine per-stroke vector undo isn't implemented — undo restores the
  whole layer to its state before that stroke. See the Sprint 2 report
  for the tradeoffs.
- **Text and shapes are vector objects** (`EditorObject`), so they stay
  independently movable/resizable/rotatable/editable after creation.
