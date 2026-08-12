"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useEditor } from "@/lib/editor/EditorProvider";
import { useCanvasEngine } from "@/lib/editor/EngineContext";
import { saveEditResult } from "@/lib/integration/result";
import { clearSession } from "@/lib/persistence/sessionStore";
import { uploadAsset, getAssetFileUrl } from "@/lib/api/assets";
import { useAuth } from "@/lib/auth/AuthContext";
import { BackendStatusIndicator } from "./BackendStatusIndicator";

type ExportFormat = "image/png" | "image/jpeg";

export function Header() {
  const { state, dispatch } = useEditor();
  const engineRef = useCanvasEngine();
  const auth = useAuth();
  const [isExporting, setIsExporting] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [format, setFormat] = useState<ExportFormat>("image/png");
  const [isReplacing, setIsReplacing] = useState(false);
  const replaceInputRef = useRef<HTMLInputElement>(null);

  function extensionFor(mime: ExportFormat) {
    return mime === "image/png" ? "png" : "jpg";
  }

  function baseName(name: string) {
    const dot = name.lastIndexOf(".");
    return dot > 0 ? name.slice(0, dot) : name;
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

  async function handleExport() {
    const engine = engineRef.current;
    if (!engine || !state.asset) return;
    setIsExporting(true);
    try {
      // Exports the actual edited HTML5 Canvas (base image + drawing
      // layer + text/shape objects + crop), not a screenshot of the page.
      const blob = await engine.exportToBlob(format);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${baseName(state.asset.name)}.${extensionFor(format)}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
    } finally {
      setIsExporting(false);
    }
  }

  async function handleSave() {
    const engine = engineRef.current;
    if (!engine || !state.asset) return;
    setSaveStatus("saving");
    try {
      const blob = await engine.exportToBlob("image/png");
      await saveEditResult(state.asset.id, blob, `${baseName(state.asset.name)}.png`);
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch (err) {
      console.error(err);
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 2500);
    }
  }

  const saveLabel = { idle: "Save", saving: "Saving…", saved: "Saved ✓", error: "Save failed" }[saveStatus];

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

        <button
          type="button"
          onClick={handleSave}
          disabled={!state.asset || saveStatus === "saving"}
          className={[
            "rounded-md border px-3 py-1.5 text-sm transition disabled:cursor-not-allowed disabled:opacity-40",
            saveStatus === "error"
              ? "border-red-800 text-red-400 hover:bg-red-950"
              : "border-slate-700 text-slate-200 hover:bg-slate-800",
          ].join(" ")}
        >
          {saveLabel}
        </button>

        <select
          value={format}
          onChange={(e) => setFormat(e.target.value as ExportFormat)}
          disabled={!state.asset}
          className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm text-slate-200 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <option value="image/png">PNG</option>
          <option value="image/jpeg">JPEG</option>
        </select>

        <button
          type="button"
          onClick={handleExport}
          disabled={!state.asset || isExporting}
          className="rounded-md bg-[#6366F1] px-3 py-1.5 text-sm font-medium text-white transition hover:bg-[#5457e0] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isExporting ? "Exporting…" : "Export"}
        </button>
      </div>
    </header>
  );
}
