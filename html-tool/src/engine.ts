import {
  CropRegion,
  EditorDocument,
  EditorObject,
  ShapeKind,
  ShapeObject,
  TextObject,
  ToolId,
  cloneDocument,
  createEmptyDocument,
  generateObjectId,
} from "./types";

export type { ToolId } from "./types";
export type { EditorDocument, EditorObject, TextObject, ShapeObject, ShapeKind, CropRegion } from "./types";

export interface BrushOptions {
  color: string;
  size: number;
  /** 0-1. Applied via ctx.globalAlpha for the stroke -- a simple,
   * real "soft brush" capability without a full multi-brush-type
   * system. Defaults to 1 (fully opaque) if unset. */
  opacity?: number;
}

export interface ShapeStyleOptions {
  shapeKind: ShapeKind;
  fill: string;
  stroke: string;
  strokeWidth: number;
}

export interface EngineCallbacks {
  /** Fired when a completed, undo-worthy action finishes (one per action, never per pointermove). */
  onCommit?: (doc: EditorDocument) => void;
  /** Fired whenever the selected object changes. Does NOT create a history entry. */
  onSelectionChange?: (objectId: string | null) => void;
  /**
   * Fired when the ENGINE wants to switch tools on its own (e.g. after
   * placing a text object, drop back to "select" so it's immediately
   * editable). The engine's internal `this.tool` is intentionally NOT
   * mutated directly for this -- only setTool() (called by the host)
   * changes it. This callback just requests that the host dispatch the
   * change and call setTool() back, keeping React's activeTool state
   * and the engine's internal tool from ever silently diverging.
   */
  onToolChange?: (tool: ToolId) => void;
  /**
   * Fired when a text object should enter inline editing -- right
   * after it's placed with the Text tool, or when an existing text
   * object is double-clicked with Select active. The host is
   * responsible for rendering the actual editing UI (an overlaid
   * textarea positioned over the object); the engine only tells it
   * WHEN and WHICH object.
   */
  onTextEditRequest?: (objectId: string) => void;
  /** Fired when the Eyedropper tool samples a pixel -- hex color string. */
  onColorPicked?: (hex: string) => void;
}

const HANDLE_SIZE = 10;
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 4;

/**
 * Standalone HTML5 Canvas editing engine. No React/Next.js dependency.
 * Owns: rendering, pointer interaction, coordinate transforms, and the
 * serializable EditorDocument. Undo/redo HISTORY is owned by the host
 * app (Astra's existing reducer) -- this engine only reports commits
 * via onCommit and can be restored via restoreState().
 */
export class CanvasEngine {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private callbacks: EngineCallbacks = {};

  private doc: EditorDocument = createEmptyDocument(1, 1);
  private sourceImage: HTMLImageElement | null = null;
  private layerImage: HTMLImageElement | null = null;
  private layerImageSrc: string | null = null;
  private pendingLayerLoadSrc: string | null = null;
  private layerCanvas: HTMLCanvasElement | null = null; // scratch canvas for draw/erase, ALWAYS kept in sync with doc.drawingLayer

  // AI Edit mask (Sprint 3). Separate canvas from the draw/erase layer,
  // NOT part of EditorDocument/history -- it's transient prep state for
  // the next Generate call, not a persisted edit in its own right (only
  // the eventual AI RESULT becomes a history checkpoint, via
  // baseImageOverride). It uses the exact same source-space coordinate
  // system as everything else, so it stays aligned through zoom/crop.
  private aiMaskCanvas: HTMLCanvasElement | null = null;
  private aiMaskBrushSize = 40;
  private aiMaskMode: "paint" | "erase" = "paint";
  private aiMaskLastPoint: { x: number; y: number } | null = null;
  private aiMaskHasContent = false;

  // Base image override (AI Edit results). originalSourceImage is the
  // untouched originally-loaded image; sourceImage is whichever is
  // CURRENTLY being rendered (original, or the latest applied AI
  // result). Keeping both lets undo/redo revert an AI edit back to the
  // original pixels via the normal restoreState() path.
  private originalSourceImage: HTMLImageElement | null = null;
  private baseImageOverrideSrc: string | null = null;
  private pendingBaseImageLoadSrc: string | null = null;

  private tool: ToolId = "select";
  private brush: BrushOptions = { color: "#f97316", size: 8 };
  private shapeStyle: ShapeStyleOptions = {
    shapeKind: "rect",
    fill: "rgba(99,102,241,0.35)",
    stroke: "#6366f1",
    strokeWidth: 2,
  };
  /** Which preset the Text tool places next -- set via setTextPreset()
   * before clicking the canvas (Toolbar exposes "Heading"/"Paragraph"
   * buttons). Not a new object type -- just different addTextAt()
   * defaults, since a paragraph is a text object same as a heading. */
  private textPreset: "heading" | "paragraph" = "heading";

  // Transient (non-committed) interaction state
  private dragMode: "none" | "move" | "resize" | "rotate" | "draw" | "shape" | "crop" | "ai-mask" = "none";
  private dragStartSource = { x: 0, y: 0 };
  private dragStartObjectBox = { x: 0, y: 0, width: 0, height: 0, rotation: 0 };
  private resizeHandle: "nw" | "ne" | "sw" | "se" | null = null;
  private pendingShape: ShapeObject | null = null;
  private pendingCrop: CropRegion | null = null;
  private isDrawingStroke = false;
  private lastStrokePoint: { x: number; y: number } | null = null;
  private editingObjectId: string | null = null;

  private boundPointerDown = this.handlePointerDown.bind(this);
  private boundPointerMove = this.handlePointerMove.bind(this);
  private boundPointerUp = this.handlePointerUp.bind(this);
  private boundDoubleClick = this.handleDoubleClick.bind(this);

  // ── Lifecycle ──────────────────────────────────────────────────

  initialize(canvas: HTMLCanvasElement, callbacks: EngineCallbacks = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.callbacks = callbacks;

    canvas.addEventListener("pointerdown", this.boundPointerDown);
    canvas.addEventListener("dblclick", this.boundDoubleClick);
    window.addEventListener("pointermove", this.boundPointerMove);
    window.addEventListener("pointerup", this.boundPointerUp);
  }

  destroy() {
    if (this.canvas) {
      this.canvas.removeEventListener("pointerdown", this.boundPointerDown);
      this.canvas.removeEventListener("dblclick", this.boundDoubleClick);
    }
    window.removeEventListener("pointermove", this.boundPointerMove);
    window.removeEventListener("pointerup", this.boundPointerUp);
    this.canvas = null;
    this.ctx = null;
    this.sourceImage = null;
    this.layerImage = null;
  }

  async loadImage(url: string): Promise<void> {
    const img = await loadHtmlImage(url);
    this.sourceImage = img;
    this.originalSourceImage = img;
    this.baseImageOverrideSrc = null;
    this.pendingBaseImageLoadSrc = null;
    this.doc = createEmptyDocument(img.naturalWidth, img.naturalHeight);
    this.layerImage = null;
    this.layerImageSrc = null;
    this.pendingLayerLoadSrc = null;
    this.layerCanvas = createBlankCanvas(this.doc.sourceWidth, this.doc.sourceHeight);
    this.aiMaskCanvas = createBlankCanvas(this.doc.sourceWidth, this.doc.sourceHeight);
    this.aiMaskHasContent = false;
    this.render();
  }

  // ── Tool / style configuration ────────────────────────────────

  setTool(tool: ToolId) {
    this.tool = tool;
    if (tool !== "crop") this.pendingCrop = null;
    this.render();
  }

  setBrushOptions(options: Partial<BrushOptions>) {
    this.brush = { ...this.brush, ...options };
  }

  setShapeStyle(options: Partial<ShapeStyleOptions>) {
    this.shapeStyle = { ...this.shapeStyle, ...options };
  }

  // ── State access ──────────────────────────────────────────────

  getState(): EditorDocument {
    return cloneDocument(this.doc);
  }

  /** Replace the current document (e.g. from undo/redo) and re-render. Does NOT emit onCommit. */
  restoreState(doc: EditorDocument) {
    this.doc = cloneDocument(doc);
    this.layerImage = null; // force layer image reload on next render
    this.layerImageSrc = null;
    this.pendingLayerLoadSrc = null;
    // CRITICAL: the scratch layerCanvas used for live drawing must be
    // re-synced to the restored document's drawing layer here. If we
    // don't, the NEXT draw/erase stroke would start from whatever the
    // canvas contained before undo/redo -- silently reintroducing
    // "undone" edits the moment the user draws again.
    this.syncLayerCanvasFromDoc();
    // Same idea for the base image: an AI Edit result (or an undo of
    // one) changes doc.baseImageOverride, which must be reflected back
    // onto the actual rendered sourceImage.
    this.syncBaseImageFromDoc();
    this.render();
  }

  /**
   * Ensures this.sourceImage matches doc.baseImageOverride (an AI Edit
   * result data URL) or reverts to the originally loaded image when
   * the override is null (e.g. after undoing an AI Edit). Async
   * because decoding a data URL is async; render() simply keeps
   * showing whatever sourceImage currently is in the meantime, same
   * safe pattern as ensureLayerImageLoaded.
   */
  private syncBaseImageFromDoc() {
    const wanted = this.doc.baseImageOverride;

    if (wanted === this.baseImageOverrideSrc) return; // already showing the right thing

    if (wanted === null) {
      this.sourceImage = this.originalSourceImage;
      this.baseImageOverrideSrc = null;
      this.pendingBaseImageLoadSrc = null;
      return;
    }

    if (this.pendingBaseImageLoadSrc === wanted) return; // already loading this one

    this.pendingBaseImageLoadSrc = wanted;
    loadHtmlImage(wanted)
      .then((img) => {
        if (this.pendingBaseImageLoadSrc !== wanted) return; // superseded
        this.pendingBaseImageLoadSrc = null;
        if (this.doc.baseImageOverride !== wanted) return; // doc moved on while decoding
        this.sourceImage = img;
        this.baseImageOverrideSrc = wanted;
        this.render();
      })
      .catch(() => {
        if (this.pendingBaseImageLoadSrc === wanted) this.pendingBaseImageLoadSrc = null;
      });
  }

  getSelectedObject(): EditorObject | null {
    return this.doc.objects.find((o) => o.id === this.doc.selectedObjectId) ?? null;
  }

  // ── Zoom ─────────────────────────────────────────────────────

  setZoom(zoom: number) {
    this.doc.zoom = clamp(zoom, MIN_ZOOM, MAX_ZOOM);
    this.render();
    this.commit();
  }

  resetView() {
    this.doc.zoom = 1;
    this.render();
    this.commit();
  }

  // ── Object editing (invoked from the Properties panel, React-owned UI) ──

  setTextPreset(preset: "heading" | "paragraph") {
    this.textPreset = preset;
  }

  addTextAt(sourceX: number, sourceY: number): string {
    const isParagraph = this.textPreset === "paragraph";
    const obj: TextObject = {
      id: generateObjectId("text"),
      type: "text",
      x: sourceX,
      y: sourceY,
      width: isParagraph ? 320 : 200,
      height: isParagraph ? 100 : 40,
      rotation: 0,
      visible: true,
      locked: false,
      text: isParagraph ? "Add your paragraph text here." : "New text",
      fontSize: isParagraph ? 15 : 24,
      color: "#f4f4f5",
      bold: false,
      italic: false,
    };
    this.doc.objects.push(obj);
    this.selectObject(obj.id);
    this.render();
    this.commit();
    return obj.id;
  }

  updateSelectedObject(partial: Partial<TextObject> | Partial<ShapeObject>) {
    const obj = this.getSelectedObject();
    if (!obj) return;
    Object.assign(obj, partial);
    this.render();
    this.commit();
  }

  deleteSelected() {
    if (!this.doc.selectedObjectId) return;
    this.doc.objects = this.doc.objects.filter((o) => o.id !== this.doc.selectedObjectId);
    this.selectObject(null);
    this.render();
    this.commit();
  }

  /** Clones the selected text/shape object with a small offset so the
   * copy is visibly distinct from the original, selects the copy. */
  duplicateSelected(): string | null {
    const original = this.getSelectedObject();
    if (!original) return null;
    const OFFSET = 16;
    const copy = {
      ...original,
      id: generateObjectId(original.type),
      x: original.x + OFFSET,
      y: original.y + OFFSET,
    };
    this.doc.objects.push(copy);
    this.selectObject(copy.id);
    this.render();
    this.commit();
    return copy.id;
  }

  // ── Layers (Sprint 3) ────────────────────────────────────────────
  //
  // Each text/shape object plus the drawing layer acts as its own
  // lightweight "layer": visibility and lock can be toggled
  // independently, and objects can be reordered (z-order == array
  // order, so "move up" means later in the array == drawn on top).
  // This intentionally does NOT introduce a separate layer-grouping
  // data structure -- doc.objects[] plus per-object visible/locked
  // IS the layer stack, keeping this additive rather than a rewrite.

  setObjectVisibility(id: string, visible: boolean) {
    const obj = this.doc.objects.find((o) => o.id === id);
    if (!obj || obj.visible === visible) return;
    obj.visible = visible;
    this.render();
    this.commit();
  }

  setObjectLocked(id: string, locked: boolean) {
    const obj = this.doc.objects.find((o) => o.id === id);
    if (!obj || obj.locked === locked) return;
    obj.locked = locked;
    // Locking doesn't change what's drawn, but it IS a durable document
    // property worth history/persistence, so still commit.
    this.commit();
  }

  setDrawingLayerVisibility(visible: boolean) {
    if (this.doc.drawingLayer.visible === visible) return;
    this.doc.drawingLayer = { ...this.doc.drawingLayer, visible };
    this.render();
    this.commit();
  }

  setDrawingLayerLocked(locked: boolean) {
    if (this.doc.drawingLayer.locked === locked) return;
    this.doc.drawingLayer = { ...this.doc.drawingLayer, locked };
    this.commit();
  }

  /** Moves an object one step toward the end of the array (drawn later == visually on top). */
  moveObjectUp(id: string) {
    const i = this.doc.objects.findIndex((o) => o.id === id);
    if (i < 0 || i === this.doc.objects.length - 1) return;
    const [obj] = this.doc.objects.splice(i, 1);
    this.doc.objects.splice(i + 1, 0, obj);
    this.render();
    this.commit();
  }

  /** Moves an object one step toward the start of the array (drawn earlier == visually behind). */
  moveObjectDown(id: string) {
    const i = this.doc.objects.findIndex((o) => o.id === id);
    if (i <= 0) return;
    const [obj] = this.doc.objects.splice(i, 1);
    this.doc.objects.splice(i - 1, 0, obj);
    this.render();
    this.commit();
  }

  deleteObject(id: string) {
    const existed = this.doc.objects.some((o) => o.id === id);
    if (!existed) return;
    this.doc.objects = this.doc.objects.filter((o) => o.id !== id);
    if (this.doc.selectedObjectId === id) this.selectObject(null);
    this.render();
    this.commit();
  }

  selectObject(id: string | null) {
    if (this.doc.selectedObjectId === id) return;
    this.doc.selectedObjectId = id;
    this.callbacks.onSelectionChange?.(id);
    this.render();
  }

  deselect() {
    this.selectObject(null);
  }

  /**
   * Called by the host when an inline text-editing overlay opens or
   * closes for a given object. While an object is "being edited", the
   * engine skips drawing that object's own canvas glyph (the overlay
   * shows the live text instead) to avoid double-rendering it.
   */
  setEditingObjectId(id: string | null) {
    this.editingObjectId = id;
    this.render();
  }

  // ── Crop ─────────────────────────────────────────────────────

  applyCrop() {
    if (!this.pendingCrop) return;
    this.doc.crop = clampCropToSource(this.pendingCrop, this.doc.sourceWidth, this.doc.sourceHeight);
    this.pendingCrop = null;
    this.render();
    this.commit();
  }

  cancelCrop() {
    this.pendingCrop = null;
    this.render();
  }

  clearCrop() {
    if (!this.doc.crop) return;
    this.doc.crop = null;
    this.render();
    this.commit();
  }

  // ── AI Edit (Sprint 3) ──────────────────────────────────────────

  setAiMaskBrushSize(size: number) {
    this.aiMaskBrushSize = Math.max(4, Math.min(200, size));
  }

  setAiMaskMode(mode: "paint" | "erase") {
    this.aiMaskMode = mode;
  }

  hasAiMaskContent(): boolean {
    return this.aiMaskHasContent;
  }

  clearAiMask() {
    if (!this.aiMaskCanvas) return;
    const ctx = this.aiMaskCanvas.getContext("2d");
    ctx?.clearRect(0, 0, this.aiMaskCanvas.width, this.aiMaskCanvas.height);
    this.aiMaskHasContent = false;
    this.render();
  }

  /** Full current base composite (image + drawing layer + visible objects), ignoring crop -- what gets sent to /api/v1/inpaint as `image`. Same pixel dimensions as the mask. */
  async exportBaseImageForAi(): Promise<Blob> {
    return this.exportComposite("image/png", { ignoreCrop: true, includeAiMask: false });
  }

  /** Binary black/white PNG mask (WHITE = edit region), same dimensions as exportBaseImageForAi(). */
  async exportAiMaskBlob(): Promise<Blob> {
    if (!this.aiMaskCanvas) throw new Error("No image loaded.");
    const binary = binarizeMaskCanvas(this.aiMaskCanvas);
    return new Promise((resolve, reject) => {
      binary.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Mask export failed."))), "image/png");
    });
  }

  /**
   * Apply a returned AI Edit result as the new base image. This
   * becomes ONE history checkpoint (via doc.baseImageOverride), so it
   * is fully undoable/redoable through the normal undo/redo path --
   * see restoreState()/syncBaseImageFromDoc(). Existing text/shape
   * objects and the drawing layer are left untouched; only the base
   * image pixels change. Clears the AI mask afterward (it was scoped
   * to this generation) and hands control back to the Select tool.
   */
  /**
   * Synchronously samples the composited pixel color at a SOURCE
   * coordinate (the "Eyedropper" tool) -- reuses the exact same
   * drawSceneSync() the live render() path uses (with the already-
   * cached this.layerImage, so it stays synchronous, no async decode
   * wait), just onto a 1:1-scale offscreen canvas instead of the
   * zoomed visible one, so source coordinates map directly with no
   * transform math needed here.
   */
  pickColorAt(sourceX: number, sourceY: number): string | null {
    if (!this.sourceImage) return null;
    const off = document.createElement("canvas");
    off.width = this.doc.sourceWidth;
    off.height = this.doc.sourceHeight;
    const octx = off.getContext("2d", { willReadFrequently: true });
    if (!octx) return null;
    this.drawSceneSync(octx, { forExport: true, layerImageOverride: this.layerImage });
    const px = Math.round(sourceX);
    const py = Math.round(sourceY);
    if (px < 0 || py < 0 || px >= off.width || py >= off.height) return null;
    const data = octx.getImageData(px, py, 1, 1).data;
    const toHex = (n: number) => n.toString(16).padStart(2, "0");
    return `#${toHex(data[0])}${toHex(data[1])}${toHex(data[2])}`;
  }

  async applyAiResult(resultImageUrl: string): Promise<void> {
    const img = await loadHtmlImage(resultImageUrl);
    this.sourceImage = img;
    this.doc.baseImageOverride = resultImageUrl;
    this.baseImageOverrideSrc = resultImageUrl; // already applied -- syncBaseImageFromDoc should no-op for this value
    this.clearAiMask();
    this.render();
    this.commit();
    this.callbacks.onToolChange?.("select");
  }

  /**
   * Swaps the base image for a different one (the "Replace" feature)
   * while preserving everything else -- objects, drawing layer, crop,
   * zoom. Modeled directly on applyAiResult()'s swap-in-place pattern.
   * The replacement is drawn at the CURRENT canvas dimensions (same
   * convention as an AI result) -- a differently-shaped image will be
   * stretched to fit rather than resizing the canvas, so existing
   * objects/crop stay meaningful relative to it.
   */
  async replaceBaseImage(imageUrl: string): Promise<void> {
    const img = await loadHtmlImage(imageUrl);
    this.sourceImage = img;
    this.doc.baseImageOverride = imageUrl;
    this.baseImageOverrideSrc = imageUrl;
    this.render();
    this.commit();
  }

  // ── Export ───────────────────────────────────────────────────

  async exportToBlob(mimeType: "image/png" | "image/jpeg" = "image/png"): Promise<Blob> {
    return this.exportComposite(mimeType, { ignoreCrop: false, includeAiMask: false });
  }

  private async exportComposite(
    mimeType: "image/png" | "image/jpeg",
    opts: { ignoreCrop: boolean; includeAiMask: boolean }
  ): Promise<Blob> {
    const fullRegion = { x: 0, y: 0, width: this.doc.sourceWidth, height: this.doc.sourceHeight };
    const region = opts.ignoreCrop ? fullRegion : this.doc.crop ?? fullRegion;
    const off = document.createElement("canvas");
    off.width = region.width;
    off.height = region.height;
    const octx = off.getContext("2d");
    if (!octx) throw new Error("Could not create export context.");

    // Export decodes the layer fresh and independently of the live
    // editing cache (this.layerImage) -- it doesn't need to be fast,
    // it needs to be correct and self-contained.
    const layerImg =
      this.doc.drawingLayer.visible && this.doc.drawingLayer.dataUrl
        ? await loadHtmlImage(this.doc.drawingLayer.dataUrl).catch(() => null)
        : null;

    octx.translate(-region.x, -region.y);
    this.drawSceneSync(octx, { forExport: true, layerImageOverride: layerImg });

    return new Promise((resolve, reject) => {
      off.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("Export failed."))),
        mimeType,
        0.92
      );
    });
  }

  // ── Rendering ────────────────────────────────────────────────
  //
  // IMPORTANT: this whole pipeline is synchronous, on purpose. An
  // earlier version awaited an async image decode *inside* the
  // ctx.save()/scale()/translate()/...restore() block, which meant any
  // drawing that happened after that await ran with the zoom/crop
  // transform already reset -- landing in the wrong coordinate space,
  // and racing with any other render() call started in the meantime.
  // That produced exactly the "old edits reappear" / flicker bugs.
  // Now: render() never awaits anything. The (possibly not-yet-decoded)
  // drawing layer is drawn from a cache if ready; if not, this frame
  // simply omits it, and the async decode -- once it resolves -- calls
  // render() again on its own to show it. No drawing ever happens
  // outside the correct, currently-active transform.

  private render() {
    if (!this.canvas || !this.ctx) return;
    const zoom = this.doc.zoom;
    const region = this.doc.crop ?? { x: 0, y: 0, width: this.doc.sourceWidth, height: this.doc.sourceHeight };

    this.canvas.width = Math.max(1, Math.round(region.width * zoom));
    this.canvas.height = Math.max(1, Math.round(region.height * zoom));

    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.save();
    this.ctx.scale(zoom, zoom);
    this.ctx.translate(-region.x, -region.y);

    if (!this.isDrawingStroke) {
      this.ensureLayerImageLoaded(this.doc.drawingLayer.dataUrl);
    }
    this.drawSceneSync(this.ctx, { forExport: false, layerImageOverride: null });

    this.ctx.restore();
  }

  /**
   * Kicks off (or no-ops if already in flight / already cached) an
   * async decode of the drawing layer's current data URL. Never blocks
   * rendering; when the decode resolves it stores the result and
   * triggers a fresh, fully synchronous render() to actually show it.
   */
  private ensureLayerImageLoaded(dataUrl: string | null) {
    if (!dataUrl) {
      this.layerImage = null;
      this.layerImageSrc = null;
      return;
    }
    if (this.layerImageSrc === dataUrl) return; // already cached and current
    if (this.pendingLayerLoadSrc === dataUrl) return; // already loading this one

    this.pendingLayerLoadSrc = dataUrl;
    loadHtmlImage(dataUrl)
      .then((img) => {
        if (this.pendingLayerLoadSrc !== dataUrl) return; // superseded while loading
        this.pendingLayerLoadSrc = null;
        // Only apply if this data URL is still the one currently wanted --
        // the document may have moved on (undo/redo/new stroke) while decoding.
        if (this.doc.drawingLayer.dataUrl !== dataUrl) return;
        this.layerImage = img;
        this.layerImageSrc = dataUrl;
        this.render();
      })
      .catch(() => {
        if (this.pendingLayerLoadSrc === dataUrl) this.pendingLayerLoadSrc = null;
      });
  }

  /** Fully synchronous: base image + drawing layer + objects (+ selection/crop UI when not exporting). */
  private drawSceneSync(
    ctx: CanvasRenderingContext2D,
    opts: { forExport: boolean; layerImageOverride: HTMLImageElement | null }
  ) {
    if (this.sourceImage) {
      ctx.drawImage(this.sourceImage, 0, 0, this.doc.sourceWidth, this.doc.sourceHeight);
    }

    const drawingLayerVisible = this.doc.drawingLayer.visible;
    if (drawingLayerVisible && this.isDrawingStroke && this.layerCanvas) {
      // Mid-stroke: draw the live scratch canvas directly. Synchronous,
      // always current, no decode needed -- this is what fixes the
      // flicker that came from re-encoding+re-decoding on every pointermove.
      ctx.drawImage(this.layerCanvas, 0, 0, this.doc.sourceWidth, this.doc.sourceHeight);
    } else if (drawingLayerVisible && opts.layerImageOverride) {
      ctx.drawImage(opts.layerImageOverride, 0, 0, this.doc.sourceWidth, this.doc.sourceHeight);
    } else if (
      drawingLayerVisible &&
      this.layerImage &&
      this.layerImageSrc === this.doc.drawingLayer.dataUrl
    ) {
      ctx.drawImage(this.layerImage, 0, 0, this.doc.sourceWidth, this.doc.sourceHeight);
    }
    // else: layer hidden, or no valid cached/override layer image for the
    // current data URL yet -- this frame simply omits it.

    for (const obj of this.doc.objects) {
      if (!obj.visible) continue;
      if (!opts.forExport && obj.id === this.editingObjectId) continue; // shown by the inline overlay instead
      this.paintObject(ctx, obj);
    }

    if (!opts.forExport) {
      if (this.tool === "ai-edit" && this.aiMaskCanvas) {
        ctx.drawImage(this.aiMaskCanvas, 0, 0, this.doc.sourceWidth, this.doc.sourceHeight);
      }
      if (this.tool === "select" && this.doc.selectedObjectId) {
        const obj = this.getSelectedObject();
        if (obj) this.paintSelectionHandles(ctx, obj);
      }
      if (this.tool === "shape" && this.pendingShape) {
        this.paintObject(ctx, this.pendingShape);
      }
      if (this.tool === "crop" && this.pendingCrop) {
        this.paintCropOverlay(ctx, this.pendingCrop);
      }
    }
  }

  private paintObject(ctx: CanvasRenderingContext2D, obj: EditorObject) {
    ctx.save();
    const cx = obj.x + obj.width / 2;
    const cy = obj.y + obj.height / 2;
    ctx.translate(cx, cy);
    ctx.rotate(obj.rotation);
    ctx.translate(-obj.width / 2, -obj.height / 2);

    // Shadow/glow (Sprint 6): both use Canvas2D's single shared shadow*
    // state -- glow takes precedence when both happen to be set (see
    // the doc comment on BaseObject.glow in types.ts). Applied BEFORE
    // the fill/stroke calls below so it affects everything drawn for
    // this object; ctx.restore() at the end clears it for whatever's
    // painted next.
    if (obj.glow) {
      ctx.shadowColor = obj.glow.color;
      ctx.shadowBlur = obj.glow.blur;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
    } else if (obj.shadow) {
      ctx.shadowColor = obj.shadow.color;
      ctx.shadowBlur = obj.shadow.blur;
      ctx.shadowOffsetX = obj.shadow.offsetX;
      ctx.shadowOffsetY = obj.shadow.offsetY;
    }

    if (obj.type === "text") {
      const weight = obj.bold ? "bold" : "normal";
      const style = obj.italic ? "italic" : "normal";
      ctx.font = `${style} ${weight} ${obj.fontSize}px system-ui, sans-serif`;
      ctx.fillStyle = obj.color;
      ctx.textBaseline = "top";
      wrapText(ctx, obj.text, 0, 0, obj.width, obj.fontSize * 1.25);
    } else if (obj.type === "shape") {
      ctx.fillStyle = obj.fillGradient ? makeLinearGradient(ctx, obj.fillGradient, obj.width, obj.height) : obj.fill;
      ctx.strokeStyle = obj.stroke;
      ctx.lineWidth = obj.strokeWidth;
      if (obj.shapeKind === "rect") {
        ctx.fillRect(0, 0, obj.width, obj.height);
        if (obj.strokeWidth > 0) ctx.strokeRect(0, 0, obj.width, obj.height);
      } else if (obj.shapeKind === "ellipse") {
        ctx.beginPath();
        ctx.ellipse(obj.width / 2, obj.height / 2, Math.abs(obj.width) / 2, Math.abs(obj.height) / 2, 0, 0, Math.PI * 2);
        ctx.fill();
        if (obj.strokeWidth > 0) ctx.stroke();
      } else if (obj.shapeKind === "line") {
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(obj.width, obj.height);
        ctx.stroke();
      } else if (obj.shapeKind === "triangle") {
        ctx.beginPath();
        ctx.moveTo(obj.width / 2, 0);
        ctx.lineTo(obj.width, obj.height);
        ctx.lineTo(0, obj.height);
        ctx.closePath();
        ctx.fill();
        if (obj.strokeWidth > 0) ctx.stroke();
      } else if (obj.shapeKind === "arrow") {
        paintArrow(ctx, obj.width, obj.height, obj.strokeWidth, obj.stroke, obj.fill);
      } else if (obj.shapeKind === "star") {
        paintStar(ctx, obj.width, obj.height);
        ctx.fill();
        if (obj.strokeWidth > 0) ctx.stroke();
      }
    }
    ctx.restore();
  }

  private paintSelectionHandles(ctx: CanvasRenderingContext2D, obj: EditorObject) {
    ctx.save();
    const cx = obj.x + obj.width / 2;
    const cy = obj.y + obj.height / 2;
    ctx.translate(cx, cy);
    ctx.rotate(obj.rotation);

    const hw = obj.width / 2;
    const hh = obj.height / 2;

    ctx.strokeStyle = "#6366f1";
    ctx.lineWidth = 1.5 / this.doc.zoom;
    ctx.setLineDash([4 / this.doc.zoom, 3 / this.doc.zoom]);
    ctx.strokeRect(-hw, -hh, obj.width, obj.height);
    ctx.setLineDash([]);

    const handleSize = HANDLE_SIZE / this.doc.zoom;
    ctx.fillStyle = "#6366f1";
    const corners: [number, number][] = [
      [-hw, -hh],
      [hw, -hh],
      [-hw, hh],
      [hw, hh],
    ];
    for (const [hx, hy] of corners) {
      ctx.fillRect(hx - handleSize / 2, hy - handleSize / 2, handleSize, handleSize);
    }

    // rotation handle
    ctx.beginPath();
    ctx.moveTo(0, -hh);
    ctx.lineTo(0, -hh - 24 / this.doc.zoom);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, -hh - 24 / this.doc.zoom, handleSize / 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  private paintCropOverlay(ctx: CanvasRenderingContext2D, crop: CropRegion) {
    ctx.save();
    ctx.strokeStyle = "#f97316";
    ctx.lineWidth = 2 / this.doc.zoom;
    ctx.setLineDash([6 / this.doc.zoom, 4 / this.doc.zoom]);
    ctx.strokeRect(crop.x, crop.y, crop.width, crop.height);
    ctx.restore();
  }

  // ── Pointer interaction ──────────────────────────────────────

  private toSourceCoords(clientX: number, clientY: number): { x: number; y: number } {
    if (!this.canvas) return { x: 0, y: 0 };
    const rect = this.canvas.getBoundingClientRect();
    const region = this.doc.crop ?? { x: 0, y: 0, width: this.doc.sourceWidth, height: this.doc.sourceHeight };
    const cssX = clientX - rect.left;
    const cssY = clientY - rect.top;
    const scaleX = this.canvas.width / rect.width || 1;
    const scaleY = this.canvas.height / rect.height || 1;
    const canvasX = cssX * scaleX;
    const canvasY = cssY * scaleY;
    return {
      x: canvasX / this.doc.zoom + region.x,
      y: canvasY / this.doc.zoom + region.y,
    };
  }

  private hitTestHandle(obj: EditorObject, sx: number, sy: number): "nw" | "ne" | "sw" | "se" | "rotate" | null {
    const zoom = this.doc.zoom;
    const local = toLocal(obj, sx, sy);
    const hw = obj.width / 2;
    const hh = obj.height / 2;
    const tolerance = (HANDLE_SIZE / zoom) * 0.9;

    if (dist(local.x, local.y, 0, -hh - 24 / zoom) < tolerance) return "rotate";
    if (dist(local.x, local.y, -hw, -hh) < tolerance) return "nw";
    if (dist(local.x, local.y, hw, -hh) < tolerance) return "ne";
    if (dist(local.x, local.y, -hw, hh) < tolerance) return "sw";
    if (dist(local.x, local.y, hw, hh) < tolerance) return "se";
    return null;
  }

  private hitTestObject(sx: number, sy: number): EditorObject | null {
    for (let i = this.doc.objects.length - 1; i >= 0; i--) {
      const obj = this.doc.objects[i];
      if (obj.locked || !obj.visible) continue; // locked/hidden objects aren't pointer-interactive
      const local = toLocal(obj, sx, sy);
      if (local.x >= -obj.width / 2 && local.x <= obj.width / 2 && local.y >= -obj.height / 2 && local.y <= obj.height / 2) {
        return obj;
      }
    }
    return null;
  }

  private handlePointerDown(e: PointerEvent) {
    if (!this.canvas) return;
    const { x, y } = this.toSourceCoords(e.clientX, e.clientY);
    this.dragStartSource = { x, y };

    if (this.tool === "select") {
      const selected = this.getSelectedObject();
      if (selected) {
        const handle = this.hitTestHandle(selected, x, y);
        if (handle === "rotate") {
          this.dragMode = "rotate";
          this.dragStartObjectBox = { ...selected };
          return;
        }
        if (handle) {
          this.dragMode = "resize";
          this.resizeHandle = handle;
          this.dragStartObjectBox = { ...selected };
          return;
        }
      }
      const hit = this.hitTestObject(x, y);
      if (hit) {
        this.selectObject(hit.id);
        this.dragMode = "move";
        this.dragStartObjectBox = { ...hit };
      } else {
        this.selectObject(null);
      }
      return;
    }

    if (this.tool === "draw" || this.tool === "eraser") {
      this.dragMode = "draw";
      this.isDrawingStroke = true;
      this.strokeTo(x, y, true);
      return;
    }

    if (this.tool === "text") {
      const id = this.addTextAt(x, y);
      // Request the switch back to "select" via the host, rather than
      // mutating this.tool directly -- see EngineCallbacks.onToolChange.
      this.callbacks.onToolChange?.("select");
      // Immediately open inline editing so typing works right where
      // the text will appear, rather than requiring a trip to the
      // Properties panel.
      this.callbacks.onTextEditRequest?.(id);
      return;
    }

    if (this.tool === "shape") {
      this.dragMode = "shape";
      this.pendingShape = {
        id: generateObjectId("shape"),
        type: "shape",
        x,
        y,
        width: 0,
        height: 0,
        rotation: 0,
        visible: true,
        locked: false,
        shapeKind: this.shapeStyle.shapeKind,
        fill: this.shapeStyle.fill,
        stroke: this.shapeStyle.stroke,
        strokeWidth: this.shapeStyle.strokeWidth,
      };
      return;
    }

    if (this.tool === "crop") {
      this.dragMode = "crop";
      this.pendingCrop = { x, y, width: 0, height: 0 };
      return;
    }

    if (this.tool === "ai-edit") {
      this.dragMode = "ai-mask";
      this.aiMaskStrokeTo(x, y, true);
      return;
    }

    if (this.tool === "eyedropper") {
      const hex = this.pickColorAt(x, y);
      if (hex) this.callbacks.onColorPicked?.(hex);
      this.callbacks.onToolChange?.("select");
      return;
    }
  }

  private handleDoubleClick(e: MouseEvent) {
    if (!this.canvas) return;
    const { x, y } = this.toSourceCoords(e.clientX, e.clientY);
    const hit = this.hitTestObject(x, y);
    if (hit && hit.type === "text") {
      this.selectObject(hit.id);
      this.callbacks.onTextEditRequest?.(hit.id);
    }
  }

  private handlePointerMove(e: PointerEvent) {
    if (this.dragMode === "none" || !this.canvas) return;
    const { x, y } = this.toSourceCoords(e.clientX, e.clientY);

    if (this.dragMode === "move") {
      const obj = this.getSelectedObject();
      if (!obj) return;
      const dx = x - this.dragStartSource.x;
      const dy = y - this.dragStartSource.y;
      obj.x = this.dragStartObjectBox.x + dx;
      obj.y = this.dragStartObjectBox.y + dy;
      this.render();
      return;
    }

    if (this.dragMode === "resize") {
      const obj = this.getSelectedObject();
      if (!obj || !this.resizeHandle) return;
      const start = this.dragStartObjectBox;
      const dx = x - this.dragStartSource.x;
      const dy = y - this.dragStartSource.y;
      let nx = start.x;
      let ny = start.y;
      let nw = start.width;
      let nh = start.height;
      if (this.resizeHandle === "se") {
        nw = Math.max(10, start.width + dx);
        nh = Math.max(10, start.height + dy);
      } else if (this.resizeHandle === "sw") {
        nw = Math.max(10, start.width - dx);
        nh = Math.max(10, start.height + dy);
        nx = start.x + start.width - nw;
      } else if (this.resizeHandle === "ne") {
        nw = Math.max(10, start.width + dx);
        nh = Math.max(10, start.height - dy);
        ny = start.y + start.height - nh;
      } else if (this.resizeHandle === "nw") {
        nw = Math.max(10, start.width - dx);
        nh = Math.max(10, start.height - dy);
        nx = start.x + start.width - nw;
        ny = start.y + start.height - nh;
      }
      obj.x = nx;
      obj.y = ny;
      obj.width = nw;
      obj.height = nh;
      this.render();
      return;
    }

    if (this.dragMode === "rotate") {
      const obj = this.getSelectedObject();
      if (!obj) return;
      const cx = obj.x + obj.width / 2;
      const cy = obj.y + obj.height / 2;
      obj.rotation = Math.atan2(y - cy, x - cx) + Math.PI / 2;
      this.render();
      return;
    }

    if (this.dragMode === "draw") {
      this.strokeTo(x, y, false);
      return;
    }

    if (this.dragMode === "shape" && this.pendingShape) {
      this.pendingShape.width = x - this.pendingShape.x;
      this.pendingShape.height = y - this.pendingShape.y;
      this.render();
      return;
    }

    if (this.dragMode === "crop" && this.pendingCrop) {
      this.pendingCrop.width = x - this.pendingCrop.x;
      this.pendingCrop.height = y - this.pendingCrop.y;
      this.render();
      return;
    }

    if (this.dragMode === "ai-mask") {
      this.aiMaskStrokeTo(x, y, false);
      return;
    }
  }

  private handlePointerUp() {
    if (this.dragMode === "move" || this.dragMode === "resize" || this.dragMode === "rotate") {
      this.commit();
    }

    if (this.dragMode === "draw" && this.isDrawingStroke) {
      this.isDrawingStroke = false;
      this.flushLayerCanvas();
      this.commit();
    }

    if (this.dragMode === "ai-mask") {
      this.aiMaskLastPoint = null; // mask painting is NOT history-tracked -- see class docstring
    }

    if (this.dragMode === "shape" && this.pendingShape) {
      const shape = normalizeBox(this.pendingShape);
      if (Math.abs(shape.width) > 2 && Math.abs(shape.height) > 2) {
        this.doc.objects.push(shape);
        this.selectObject(shape.id);
        this.commit();
      }
      this.pendingShape = null;
      this.render();
    }

    if (this.dragMode === "crop" && this.pendingCrop) {
      this.pendingCrop = normalizeRect(this.pendingCrop);
    }

    this.dragMode = "none";
    this.resizeHandle = null;
  }

  /**
   * Re-syncs the scratch layerCanvas from doc.drawingLayer.dataUrl.
   * MUST be called whenever the document's drawing layer changes from
   * something other than a live stroke (i.e. restoreState / undo/redo)
   * -- otherwise the next draw/erase stroke would silently start from
   * stale, pre-undo pixel content. Async because decoding a data URL
   * is async; render() is unaffected in the meantime since it only
   * reads layerCanvas while isDrawingStroke is true.
   */
  private syncLayerCanvasFromDoc() {
    const dataUrl = this.doc.drawingLayer.dataUrl;
    const canvas = this.layerCanvas ?? createBlankCanvas(this.doc.sourceWidth, this.doc.sourceHeight);
    this.layerCanvas = canvas;
    const lctx = canvas.getContext("2d");
    if (!lctx) return;
    lctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!dataUrl) return;
    loadHtmlImage(dataUrl)
      .then((img) => {
        // Bail if the document moved on again before this decode finished.
        if (this.doc.drawingLayer.dataUrl !== dataUrl || !this.layerCanvas) return;
        const ctx2 = this.layerCanvas.getContext("2d");
        ctx2?.clearRect(0, 0, this.layerCanvas.width, this.layerCanvas.height);
        ctx2?.drawImage(img, 0, 0);
      })
      .catch(() => {
        /* leave layerCanvas blank on decode failure */
      });
  }

  private strokeTo(x: number, y: number, isStart: boolean) {
    if (!this.layerCanvas) return;
    const lctx = this.layerCanvas.getContext("2d");
    if (!lctx) return;

    lctx.globalCompositeOperation = this.tool === "eraser" ? "destination-out" : "source-over";
    lctx.globalAlpha = this.brush.opacity ?? 1;
    lctx.strokeStyle = this.brush.color;
    lctx.lineWidth = this.brush.size;
    lctx.lineCap = "round";
    lctx.lineJoin = "round";

    if (isStart || !this.lastStrokePoint) {
      lctx.beginPath();
      lctx.moveTo(x, y);
      lctx.lineTo(x + 0.01, y + 0.01);
      lctx.stroke();
    } else {
      lctx.beginPath();
      lctx.moveTo(this.lastStrokePoint.x, this.lastStrokePoint.y);
      lctx.lineTo(x, y);
      lctx.stroke();
    }
    this.lastStrokePoint = { x, y };

    // No dataURL round-trip here (that was the source of the
    // flicker/blank bug) -- render() draws this.layerCanvas directly,
    // synchronously, while isDrawingStroke is true.
    this.render();
  }

  private flushLayerCanvas() {
    if (!this.layerCanvas) return;
    this.doc.drawingLayer = {
      ...this.doc.drawingLayer,
      dataUrl: this.layerCanvas.toDataURL("image/png"),
    };
    this.layerImageSrc = null; // the cached decode (if any) is now stale
    this.layerImage = null;
    this.lastStrokePoint = null;
  }

  /**
   * Paint or erase into the AI mask canvas. Uses a bright, semi-
   * transparent color for good on-screen visibility while painting;
   * exportAiMaskBlob() separately binarizes this into a clean
   * black/white mask for the backend (alpha>0 -> opaque white),
   * so the softness of the on-screen brush never leaks into the
   * actual inference mask beyond what feathering intentionally adds
   * server-side.
   */
  private aiMaskStrokeTo(x: number, y: number, isStart: boolean) {
    if (!this.aiMaskCanvas) return;
    const ctx = this.aiMaskCanvas.getContext("2d");
    if (!ctx) return;

    ctx.globalCompositeOperation = this.aiMaskMode === "erase" ? "destination-out" : "source-over";
    ctx.fillStyle = "rgba(56, 189, 248, 0.55)"; // sky-blue, only relevant for "paint" (source-over)
    ctx.strokeStyle = "rgba(56, 189, 248, 0.55)";
    ctx.lineWidth = this.aiMaskBrushSize;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (isStart || !this.aiMaskLastPoint) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 0.01, y + 0.01);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(this.aiMaskLastPoint.x, this.aiMaskLastPoint.y);
      ctx.lineTo(x, y);
      ctx.stroke();
    }
    this.aiMaskLastPoint = { x, y };
    if (this.aiMaskMode === "paint") this.aiMaskHasContent = true;
    this.render();
  }

  private commit() {
    this.callbacks.onCommit?.(cloneDocument(this.doc));
  }
}

// ── Free functions ──────────────────────────────────────────────

/** Builds a linear gradient spanning an object's local (post-rotation-
 * transform) bounding box at the given angle. 0deg = left-to-right,
 * 90deg = top-to-bottom, matching the common "angle" convention used
 * in most design tools rather than raw trigonometric radians. */
function makeLinearGradient(
  ctx: CanvasRenderingContext2D,
  spec: { from: string; to: string; angleDeg: number },
  width: number,
  height: number
): CanvasGradient {
  const rad = (spec.angleDeg * Math.PI) / 180;
  const cx = width / 2;
  const cy = height / 2;
  // Half-diagonal ensures the gradient line fully spans the box at any angle.
  const half = Math.sqrt(width * width + height * height) / 2;
  const dx = Math.cos(rad) * half;
  const dy = Math.sin(rad) * half;
  const gradient = ctx.createLinearGradient(cx - dx, cy - dy, cx + dx, cy + dy);
  gradient.addColorStop(0, spec.from);
  gradient.addColorStop(1, spec.to);
  return gradient;
}

/** Draws a line from (0,0) to (w,h) with a triangular arrowhead at the end. */
function paintArrow(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  strokeWidth: number,
  stroke: string,
  fill: string
) {
  const headLength = Math.max(10, strokeWidth * 4);
  const angle = Math.atan2(h, w);

  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(w, h);
  ctx.stroke();

  ctx.save();
  ctx.translate(w, h);
  ctx.rotate(angle);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(-headLength, headLength / 2);
  ctx.lineTo(-headLength, -headLength / 2);
  ctx.closePath();
  ctx.fillStyle = stroke || fill;
  ctx.fill();
  ctx.restore();
}

/** Traces a 5-point star inscribed in the (w, h) bounding box. Caller fills/strokes. */
function paintStar(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const cx = w / 2;
  const cy = h / 2;
  const outerRx = Math.abs(w) / 2;
  const outerRy = Math.abs(h) / 2;
  const innerRatio = 0.42;
  const points = 5;

  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const angle = (Math.PI / points) * i - Math.PI / 2;
    const rx = i % 2 === 0 ? outerRx : outerRx * innerRatio;
    const ry = i % 2 === 0 ? outerRy : outerRy * innerRatio;
    const px = cx + rx * Math.cos(angle);
    const py = cy + ry * Math.sin(angle);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

/**
 * Converts a soft-alpha mask canvas (as painted on screen) into a
 * clean binary black/white canvas: any pixel with alpha > threshold
 * becomes fully opaque white, everything else becomes fully opaque
 * black. This is the explicit WHITE=edit / BLACK=preserve convention
 * required by the inpaint API -- the on-screen brush can stay soft
 * and semi-transparent for good visual feedback without that
 * softness leaking into the actual inference mask (server-side
 * feathering is the intentional, controlled way to soften edges).
 */
function binarizeMaskCanvas(source: HTMLCanvasElement, alphaThreshold = 10): HTMLCanvasElement {
  const out = createBlankCanvas(source.width, source.height);
  const outCtx = out.getContext("2d");
  if (!outCtx) return out;

  outCtx.fillStyle = "black";
  outCtx.fillRect(0, 0, out.width, out.height);

  const srcCtx = source.getContext("2d");
  if (!srcCtx) return out;
  const srcData = srcCtx.getImageData(0, 0, source.width, source.height);
  const outData = outCtx.getImageData(0, 0, out.width, out.height);

  for (let i = 0; i < srcData.data.length; i += 4) {
    const alpha = srcData.data[i + 3];
    if (alpha > alphaThreshold) {
      outData.data[i] = 255;
      outData.data[i + 1] = 255;
      outData.data[i + 2] = 255;
      outData.data[i + 3] = 255;
    }
  }
  outCtx.putImageData(outData, 0, 0);
  return out;
}

function createBlankCanvas(width: number, height: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(width));
  c.height = Math.max(1, Math.round(height));
  return c;
}

function loadHtmlImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image."));
    img.src = src;
  });
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function toLocal(obj: EditorObject, sx: number, sy: number): { x: number; y: number } {
  const cx = obj.x + obj.width / 2;
  const cy = obj.y + obj.height / 2;
  const dx = sx - cx;
  const dy = sy - cy;
  const cos = Math.cos(-obj.rotation);
  const sin = Math.sin(-obj.rotation);
  return { x: dx * cos - dy * sin, y: dx * sin + dy * cos };
}

function dist(x1: number, y1: number, x2: number, y2: number): number {
  return Math.hypot(x1 - x2, y1 - y2);
}

function normalizeBox<T extends { x: number; y: number; width: number; height: number }>(box: T): T {
  const x = box.width < 0 ? box.x + box.width : box.x;
  const y = box.height < 0 ? box.y + box.height : box.y;
  return { ...box, x, y, width: Math.abs(box.width), height: Math.abs(box.height) };
}

function normalizeRect(rect: CropRegion): CropRegion {
  return normalizeBox(rect);
}

function clampCropToSource(crop: CropRegion, sourceWidth: number, sourceHeight: number): CropRegion {
  const x = clamp(crop.x, 0, sourceWidth);
  const y = clamp(crop.y, 0, sourceHeight);
  const width = clamp(crop.width, 1, sourceWidth - x);
  const height = clamp(crop.height, 1, sourceHeight - y);
  return { x, y, width, height };
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
  const words = text.split(" ");
  let line = "";
  let lineY = y;
  for (const word of words) {
    const testLine = line ? `${line} ${word}` : word;
    if (ctx.measureText(testLine).width > maxWidth && line) {
      ctx.fillText(line, x, lineY);
      line = word;
      lineY += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, x, lineY);
}
