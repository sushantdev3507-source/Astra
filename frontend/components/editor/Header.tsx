"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useEditor } from "@/lib/editor/EditorProvider";
import { useCanvasEngine } from "@/lib/editor/EngineContext";
import { clearSession } from "@/lib/persistence/sessionStore";
import { uploadAsset, getAssetFileUrl } from "@/lib/api/assets";
import { useAuth } from "@/lib/auth/AuthContext";
import { serializeProjectToBlob, parseAstraProjectFile, InvalidAstraFileError } from "@/lib/project/astraFile";
import { captureAllPagesAsBlobs, buildPdfBlob } from "@/lib/export/multiPageExport";
import { BackendStatusIndicator } from "./BackendStatusIndicator";
import type { PageRecord } from "@/lib/editor/types";

type ImageFormat = "image/png" | "image/jpeg" | "image/webp";
type DownloadFormat = ImageFormat | "application/pdf";
type ExportScope = "current" | "all";
type ActionStatus = "idle" | "busy" | "done" | "error";

const FORMAT_LABELS: Record<DownloadFormat, string> = {
  "image/png": "PNG",
  "image/jpeg": "JPG",
  "image/webp": "WebP",
  "application/pdf": "PDF",
};
const FORMAT_EXTENSIONS: Record<DownloadFormat, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

export function Header() {
  const { state, dispatch } = useEditor();
  const engineRef = useCanvasEngine();
  const auth = useAuth();
  const [isReplacing, setIsReplacing] = useState(false);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const openProjectInputRef = useRef<HTMLInputElement>(null);

  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const [downloadFormat, setDownloadFormat] = useState<DownloadFormat>("image/png");
  const [downloadScope, setDownloadScope] = useState<ExportScope>("current");

  const [saveProjectStatus, setSaveProjectStatus] = useState<ActionStatus>("idle");
  const [openProjectStatus, setOpenProjectStatus] = useState<ActionStatus>("idle");
  const [downloadStatus, setDownloadStatus] = useState<ActionStatus>("idle");
  const [printStatus, setPrintStatus] = useState<ActionStatus>("idle");
  const [copyImageStatus, setCopyImageStatus] = useState<ActionStatus>("idle");
  const [menuError, setMenuError] = useState<string | null>(null);

  // Browser capability detection for Copy Image -- NOT universally
  // supported, so hidden entirely rather than shown-and-failing.
  // Computed in an effect (not inline in the render body) since
  // `navigator`/`window` don't exist during Next.js's server-side
  // render pass.
  const [canCopyImage, setCanCopyImage] = useState(false);
  useEffect(() => {
    // Deferred through a promise callback rather than called directly
    // in the effect body -- same fix pattern used elsewhere in this
    // codebase for this exact lint rule (react-hooks/set-state-in-effect).
    Promise.resolve().then(() => {
      setCanCopyImage(
        typeof navigator !== "undefined" &&
          typeof navigator.clipboard?.write === "function" &&
          typeof window.ClipboardItem === "function"
      );
    });
  }, []);

  useEffect(() => {
    if (!showExportMenu) return;
    function onClickOutside(e: MouseEvent) {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setShowExportMenu(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [showExportMenu]);

  function baseName(name: string) {
    const dot = name.lastIndexOf(".");
    return dot > 0 ? name.slice(0, dot) : name;
  }

  function triggerDownload(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function handleNewImage() {
    if (!state.asset) return;
    const confirmed = window.confirm(
      "Load a new image? Any unsaved edits to the current image will be lost."
    );
    if (!confirmed) return;
    clearSession(); // don't offer to restore an asset the user just explicitly abandoned
    dispatch({ type: "asset/clear" });
  }

  /**
   * "Replace" -- swaps ONLY the base image, keeping every existing
   * text/shape object, the drawing layer, and crop intact. Different
   * from "New Image" (handleNewImage above), which clears everything
   * and starts fresh. Uploads through the same real asset pipeline as
   * a normal upload -- engine.replaceBaseImage() then does the actual
   * swap-in-place (see html-tool/src/engine.ts).
   */
  async function handleReplaceFile(file: File | undefined) {
    const engine = engineRef.current;
    if (!file || !engine) return;
    setIsReplacing(true);
    try {
      const asset = await uploadAsset(file);
      await engine.replaceBaseImage(getAssetFileUrl(asset));
    } catch {
      window.alert("Could not replace the image. Please try again.");
    } finally {
      setIsReplacing(false);
    }
  }

  // --- Export > Project > Save ---
  // Downloads a local, self-contained .astra project file -- makes NO
  // backend request of any kind (unlike the old standalone Save
  // button, which is REMOVED; see astraFile.ts's module docstring for
  // why this is a genuinely different action, not a rename).
  async function handleSaveProject() {
    if (!state.asset && state.pageOrder.length <= 1) return;
    setSaveProjectStatus("busy");
    setMenuError(null);
    try {
      const blob = await serializeProjectToBlob(state);
      const name = state.asset ? baseName(state.asset.name) : "astra-project";
      triggerDownload(blob, `${name}.astra`);
      setSaveProjectStatus("done");
      setTimeout(() => setSaveProjectStatus("idle"), 2000);
    } catch (err) {
      console.error(err);
      setSaveProjectStatus("error");
      setMenuError("Could not save the project file. Please try again.");
      setTimeout(() => setSaveProjectStatus("idle"), 2500);
    }
  }

  // --- Export > Project > Open Project ---
  // Reuses the EXACT same page/restoreAll action IndexedDB session
  // recovery already uses (see SessionRecoveryPrompt.tsx) -- a .astra
  // file and a recovered session are the same shape by design.
  async function handleOpenProjectFile(file: File | undefined) {
    if (!file) return;
    setOpenProjectStatus("busy");
    setMenuError(null);
    try {
      const text = await file.text();
      const project = parseAstraProjectFile(text);
      dispatch({
        type: "page/restoreAll",
        pages: project.pages as Record<string, PageRecord>,
        pageOrder: project.pageOrder,
        activePageId: project.activePageId,
      });
      setOpenProjectStatus("idle");
      setShowExportMenu(false);
    } catch (err) {
      const message =
        err instanceof InvalidAstraFileError ? err.message : "Could not open this project file.";
      console.error(err);
      setOpenProjectStatus("error");
      setMenuError(message);
      setTimeout(() => setOpenProjectStatus("idle"), 2500);
    }
  }

  // --- Export > Download ---
  async function handleDownload() {
    const engine = engineRef.current;
    if (!engine || !state.asset) return;
    setDownloadStatus("busy");
    setMenuError(null);
    try {
      const isPdf = downloadFormat === "application/pdf";
      const imageFormat: ImageFormat = isPdf ? "image/png" : downloadFormat;

      if (downloadScope === "current") {
        const blob = await engine.exportToBlob(imageFormat);
        if (isPdf) {
          const doc = engine.getState();
          const pdfBlob = await buildPdfBlob([{ blob, width: doc.sourceWidth, height: doc.sourceHeight }]);
          triggerDownload(pdfBlob, `${baseName(state.asset.name)}.pdf`);
        } else {
          triggerDownload(blob, `${baseName(state.asset.name)}.${FORMAT_EXTENSIONS[downloadFormat]}`);
        }
      } else {
        // All Pages -- see multiPageExport.ts's module docstring for
        // why this briefly switches through every page visibly rather
        // than rendering them invisibly in the background.
        const pageBlobs = await captureAllPagesAsBlobs(state, engine, dispatch, imageFormat);
        if (isPdf) {
          const pdfBlob = await buildPdfBlob(pageBlobs.map((p) => ({ blob: p.blob, width: p.width, height: p.height })));
          triggerDownload(pdfBlob, `${baseName(state.asset.name)}-all-pages.pdf`);
        } else {
          // Multiple image files can't be "one download" -- trigger
          // one browser download per page, clearly named/numbered.
          pageBlobs.forEach((p, i) => {
            triggerDownload(p.blob, `${baseName(state.asset!.name)}-page${i + 1}-${p.name}.${FORMAT_EXTENSIONS[downloadFormat]}`);
          });
        }
      }
      setDownloadStatus("idle");
      setShowExportMenu(false);
    } catch (err) {
      console.error(err);
      setDownloadStatus("error");
      setMenuError("Export failed. Please try again.");
      setTimeout(() => setDownloadStatus("idle"), 2000);
    }
  }

  // --- Export > Print ---
  /** Opens a dedicated print window containing just the image, then
   * invokes the browser's native print dialog -- printing the app's
   * own UI chrome (toolbar, panels) would be pointless, so this
   * deliberately does NOT just call window.print() on the current page. */
  async function handlePrint() {
    const engine = engineRef.current;
    if (!engine || !state.asset) return;
    setPrintStatus("busy");
    try {
      const blob = await engine.exportToBlob("image/png");
      const url = URL.createObjectURL(blob);
      const printWindow = window.open("", "_blank", "width=900,height=700");
      if (!printWindow) {
        window.alert("Please allow pop-ups for this site to print.");
        URL.revokeObjectURL(url);
        setPrintStatus("idle");
        return;
      }
      printWindow.document.write(
        `<!DOCTYPE html><html><head><title>${state.asset.name}</title>` +
          `<style>@page{margin:0}html,body{margin:0;padding:0;background:#fff}` +
          `img{display:block;margin:auto;max-width:100%;max-height:100vh}</style></head>` +
          `<body><img src="${url}" onload="window.focus();window.print();"></body>` +
          `<script>window.onafterprint=function(){window.close();};</script></html>`
      );
      printWindow.document.close();
      setTimeout(() => URL.revokeObjectURL(url), 15000); // give the print dialog time to load the image first
      setPrintStatus("idle");
      setShowExportMenu(false);
    } catch (err) {
      console.error(err);
      setPrintStatus("error");
      setTimeout(() => setPrintStatus("idle"), 2000);
    }
  }

  // --- Export > Clipboard > Copy Image ---
  async function handleCopyImage() {
    const engine = engineRef.current;
    if (!engine || !state.asset) return;
    setCopyImageStatus("busy");
    try {
      // Clipboard image writes are PNG-only in every browser that
      // supports this API -- ignore the selected download format here.
      const blob = await engine.exportToBlob("image/png");
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      setCopyImageStatus("done");
      setTimeout(() => setCopyImageStatus("idle"), 2000);
    } catch (err) {
      console.error(err);
      setCopyImageStatus("error");
      setTimeout(() => setCopyImageStatus("idle"), 2000);
    }
  }

  const anyExportActionBusy = [
    saveProjectStatus,
    openProjectStatus,
    downloadStatus,
    printStatus,
    copyImageStatus,
  ].includes("busy");

  return (
    <header className="relative z-10 flex h-14 shrink-0 items-center justify-between border-b border-slate-700/50 bg-slate-900/80 px-4 backdrop-blur-md">
      <div className="flex items-center gap-3">
        <Image
          src="/branding/astra-icon.png"
          alt="Astra"
          width={32}
          height={32}
          className="rounded-md"
          priority
        />
        <span className="text-lg font-semibold tracking-wide text-slate-100">ASTRA</span>
        {state.asset && (
          <>
            <span className="hidden max-w-[240px] truncate text-sm text-slate-500 sm:inline">
              {state.asset.name}
            </span>
            <button
              type="button"
              onClick={() => replaceInputRef.current?.click()}
              disabled={isReplacing}
              title="Replace the base image, keeping text/shapes/drawing"
              className="rounded-md border border-slate-700 px-2 py-1 text-xs text-slate-400 transition hover:border-slate-600 hover:text-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isReplacing ? "Replacing…" : "Replace"}
            </button>
            <input
              ref={replaceInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp"
              className="hidden"
              onChange={(e) => {
                handleReplaceFile(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
            <button
              type="button"
              onClick={handleNewImage}
              title="Load a different image"
              className="rounded-md border border-slate-700 px-2 py-1 text-xs text-slate-400 transition hover:border-slate-600 hover:text-slate-200"
            >
              New Image
            </button>
          </>
        )}
      </div>

      <div className="flex items-center gap-3">
        <BackendStatusIndicator />

        {!auth.isLoading &&
          (auth.user ? (
            <div className="flex items-center gap-2 border-r border-slate-700/50 pr-3 text-xs text-slate-400">
              <span className="hidden sm:inline">{auth.user.name}</span>
              <button
                type="button"
                onClick={auth.logout}
                className="rounded border border-slate-700 px-2 py-1 text-slate-300 hover:bg-slate-800"
              >
                Sign out
              </button>
            </div>
          ) : (
            <Link
              href="/auth"
              className="border-r border-slate-700/50 pr-3 text-xs text-slate-400 hover:text-slate-200"
            >
              Sign in
            </Link>
          ))}

        {/* Only one primary action here -- Export. The old standalone
            Save button is gone; Save now lives inside this menu under
            Project, and downloads a local .astra file instead of
            calling the backend -- see handleSaveProject() above. */}
        <div className="relative" ref={exportMenuRef}>
          <button
            type="button"
            onClick={() => {
              setShowExportMenu((v) => !v);
              setMenuError(null);
            }}
            disabled={anyExportActionBusy}
            className="rounded-md bg-[#6366F1] px-3 py-1.5 text-sm font-medium text-white transition hover:bg-[#5457e0] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Export {anyExportActionBusy ? "…" : "▾"}
          </button>

          {showExportMenu && (
            <div className="absolute right-0 top-full z-20 mt-1.5 w-72 overflow-hidden rounded-md border border-slate-700 bg-slate-900 shadow-xl">
              {menuError && (
                <p className="border-b border-slate-800 bg-red-950/40 px-3 py-2 text-xs text-red-300">{menuError}</p>
              )}

              <div className="border-b border-slate-800 px-3 pb-2 pt-2.5">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Project</p>
              </div>
              <button
                type="button"
                onClick={handleSaveProject}
                className="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-slate-200 hover:bg-slate-800"
              >
                Save
                <span className="text-xs text-slate-500">
                  {saveProjectStatus === "busy" ? "Saving…" : saveProjectStatus === "done" ? "Saved ✓" : ".astra"}
                </span>
              </button>
              <button
                type="button"
                onClick={() => openProjectInputRef.current?.click()}
                className="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-slate-200 hover:bg-slate-800"
              >
                Open Project
                {openProjectStatus === "busy" && <span className="text-xs text-slate-500">Opening…</span>}
              </button>
              <input
                ref={openProjectInputRef}
                type="file"
                accept=".astra,application/json"
                className="hidden"
                onChange={(e) => {
                  handleOpenProjectFile(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />

              <div className="border-b border-t border-slate-800 px-3 pb-2 pt-2.5">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Download</p>
              </div>
              <div className="flex flex-col gap-2 px-3 py-2">
                <div className="flex flex-wrap gap-1.5">
                  {(Object.keys(FORMAT_LABELS) as DownloadFormat[]).map((fmt) => (
                    <button
                      key={fmt}
                      type="button"
                      onClick={() => setDownloadFormat(fmt)}
                      className={[
                        "rounded px-2 py-1 text-xs font-medium transition",
                        downloadFormat === fmt ? "bg-[#6366F1] text-white" : "border border-slate-700 text-slate-400",
                      ].join(" ")}
                    >
                      {FORMAT_LABELS[fmt]}
                    </button>
                  ))}
                </div>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => setDownloadScope("current")}
                    className={[
                      "flex-1 rounded px-2 py-1 text-xs font-medium transition",
                      downloadScope === "current" ? "bg-slate-700 text-white" : "border border-slate-700 text-slate-400",
                    ].join(" ")}
                  >
                    Current Page
                  </button>
                  <button
                    type="button"
                    onClick={() => setDownloadScope("all")}
                    disabled={state.pageOrder.length <= 1}
                    title={state.pageOrder.length <= 1 ? "Only one page in this project" : undefined}
                    className={[
                      "flex-1 rounded px-2 py-1 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-40",
                      downloadScope === "all" ? "bg-slate-700 text-white" : "border border-slate-700 text-slate-400",
                    ].join(" ")}
                  >
                    All Pages
                  </button>
                </div>
                <button
                  type="button"
                  onClick={handleDownload}
                  disabled={!state.asset || anyExportActionBusy}
                  className="mt-0.5 rounded-md bg-[#6366F1] py-1.5 text-sm font-medium text-white transition hover:bg-[#5457e0] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {downloadStatus === "busy" ? "Exporting…" : "Download"}
                </button>
              </div>

              {canCopyImage && (
                <>
                  <div className="border-b border-t border-slate-800 px-3 pb-2 pt-2.5">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Clipboard</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyImage}
                    className="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-slate-200 hover:bg-slate-800"
                  >
                    Copy Image
                    {copyImageStatus === "done" && <span className="text-xs text-emerald-400">Copied ✓</span>}
                  </button>
                </>
              )}

              <div className="border-b border-t border-slate-800 px-3 pb-2 pt-2.5">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Print</p>
              </div>
              <button
                type="button"
                onClick={handlePrint}
                className="flex w-full items-center px-3 py-2 text-left text-sm text-slate-200 hover:bg-slate-800"
              >
                Print
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
