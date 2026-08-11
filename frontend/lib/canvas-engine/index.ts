/**
 * Thin re-export boundary between the frontend and the standalone
 * html-tool engine (astra/html-tool). Import from "@/lib/canvas-engine"
 * everywhere in the frontend rather than reaching into html-tool
 * directly, so the actual engine location can move without touching
 * every call site.
 */
export * from "../../../html-tool/src/engine";
export type { DrawingLayer } from "../../../html-tool/src/types";
export { createEmptyDocument, cloneDocument, generateObjectId } from "../../../html-tool/src/types";
