/**
 * html-tool — standalone HTML5 Canvas editing engine.
 *
 * This module has NO framework dependencies (no React, no Next.js).
 * It is the "engine" half of the Astra editor; frontend/ is the "UI"
 * half. See engine.ts for the class that operates on these types.
 */

export type ToolId =
  | "select"
  | "draw"
  | "eraser"
  | "text"
  | "shape"
  | "crop"
  | "ai-edit"
  | "eyedropper";

export type ShapeKind = "rect" | "ellipse" | "line" | "triangle" | "arrow" | "star";

interface BaseObject {
  id: string;
  /** Position/size are always in SOURCE IMAGE coordinates, never screen/viewport pixels. */
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number; // radians
  /** Layer controls (Sprint 3). Hidden objects are skipped when rendering AND exporting. */
  visible: boolean;
  /** Locked objects can't be selected/moved/resized/rotated/deleted via pointer interaction. */
  locked: boolean;
  /**
   * Drop shadow, applicable to any object (text or shape). Mutually
   * exclusive with `glow` in practice -- if both are set, glow takes
   * visual precedence (see engine.ts's paintObject). null/undefined
   * means no shadow.
   */
  shadow?: { color: string; blur: number; offsetX: number; offsetY: number } | null;
  /**
   * A glow effect -- implemented as a zero-offset, typically-larger-
   * blur shadow, which reads visually as a halo rather than a cast
   * shadow. Same underlying Canvas2D shadow* mechanism as `shadow`
   * above; kept as a separate field rather than a "shadow with offset
   * 0" convention so the UI can toggle them independently and clearly.
   */
  glow?: { color: string; blur: number } | null;
}

export interface TextObject extends BaseObject {
  type: "text";
  text: string;
  fontSize: number;
  color: string;
  bold: boolean;
  italic: boolean;
}

export interface ShapeObject extends BaseObject {
  type: "shape";
  shapeKind: ShapeKind;
  fill: string;
  stroke: string;
  strokeWidth: number;
  /**
   * When set, overrides `fill` with a two-color linear gradient at the
   * given angle (degrees, 0 = left-to-right). `fill` is kept as the
   * fallback/solid value so turning the gradient off doesn't lose the
   * last solid color choice.
   */
  fillGradient?: { from: string; to: string; angleDeg: number } | null;
}

/** A single freehand draw/erase pass, rasterized once completed. */
export interface DrawingLayer {
  /** PNG data URL of the annotation layer, same pixel dimensions as the source image. */
  dataUrl: string | null;
  visible: boolean;
  locked: boolean;
}

export type EditorObject = TextObject | ShapeObject;

export interface CropRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * The full serializable state of one editing session. This is what
 * gets pushed into undo/redo history, persisted to IndexedDB, and
 * restored on undo/redo/reload.
 *
 * baseImageOverride (Sprint 3): when an AI Edit result is applied, the
 * CURRENT base image becomes this data URL instead of the originally
 * uploaded image. It's part of the document specifically so AI edits
 * flow through the exact same undo/redo history as everything else --
 * see engine.ts's applyAiResult()/restoreState() for how this gets
 * applied to the rendered canvas.
 */
export interface EditorDocument {
  version: 2;
  sourceWidth: number;
  sourceHeight: number;
  zoom: number;
  crop: CropRegion | null;
  drawingLayer: DrawingLayer;
  objects: EditorObject[];
  selectedObjectId: string | null;
  baseImageOverride: string | null;
}

export function createEmptyDocument(sourceWidth: number, sourceHeight: number): EditorDocument {
  return {
    version: 2,
    sourceWidth,
    sourceHeight,
    zoom: 1,
    crop: null,
    drawingLayer: { dataUrl: null, visible: true, locked: false },
    objects: [],
    selectedObjectId: null,
    baseImageOverride: null,
  };
}

export function cloneDocument(doc: EditorDocument): EditorDocument {
  // Structured clone is fine here — the document is plain JSON-safe data.
  return JSON.parse(JSON.stringify(doc));
}

let idCounter = 0;
export function generateObjectId(prefix: string): string {
  idCounter += 1;
  return `${prefix}_${Date.now().toString(36)}_${idCounter}`;
}
