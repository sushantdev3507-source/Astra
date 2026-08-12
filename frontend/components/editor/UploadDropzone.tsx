"use client";

import { ChangeEvent, DragEvent, useRef, useState } from "react";
import { useEditor } from "@/lib/editor/EditorProvider";
import { uploadAsset } from "@/lib/api/assets";
import { ApiError } from "@/lib/api/client";

const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp"];

/** Common preset canvas sizes -- publicly documented platform
 * dimensions, not fabricated. Each just creates a blank white canvas
 * at that size and feeds it through the exact same upload pipeline as
 * a real file -- no special-casing anywhere else in the app (session
 * recovery, export, undo/redo all just work, since it becomes a real
 * asset like any other). */
const TEMPLATES = [
  { label: "Instagram Post", width: 1080, height: 1080 },
  { label: "Instagram Story", width: 1080, height: 1920 },
  { label: "Facebook Post", width: 1200, height: 630 },
  { label: "YouTube Thumbnail", width: 1280, height: 720 },
  { label: "Poster (A4)", width: 2480, height: 3508 },
];

function createBlankCanvasFile(width: number, height: number, label: string): Promise<File> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      reject(new Error("Could not create canvas context."));
      return;
    }
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Could not generate template image."));
        return;
      }
      resolve(new File([blob], `${label.toLowerCase().replace(/\s+/g, "-")}.png`, { type: "image/png" }));
    }, "image/png");
  });
}

export function UploadDropzone() {
  const { state, dispatch } = useEditor();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  async function handleFile(file: File | undefined) {
    if (!file) return;

    if (!ACCEPTED_TYPES.includes(file.type)) {
      dispatch({
        type: "upload/error",
        message: `Unsupported file type "${file.type || "unknown"}". Please upload a PNG, JPEG, or WEBP image.`,
      });
      return;
    }

    dispatch({ type: "upload/start" });
    try {
      const asset = await uploadAsset(file);
      dispatch({ type: "asset/set", asset });
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "Something went wrong while uploading. Please try again.";
      dispatch({ type: "upload/error", message });
    }
  }

  async function handleTemplate(template: (typeof TEMPLATES)[number]) {
    dispatch({ type: "upload/start" });
    try {
      const file = await createBlankCanvasFile(template.width, template.height, template.label);
      await handleFile(file);
    } catch {
      dispatch({ type: "upload/error", message: "Could not create a blank canvas for that template." });
    }
  }

  function onInputChange(e: ChangeEvent<HTMLInputElement>) {
    handleFile(e.target.files?.[0]);
    e.target.value = "";
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    handleFile(e.dataTransfer.files?.[0]);
  }

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-4 p-8">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={[
          "flex w-full max-w-md cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed p-10 text-center transition",
          isDragging ? "border-[#6366F1] bg-[#6366F1]/10" : "border-slate-700 hover:border-slate-500",
        ].join(" ")}
      >
        <span className="text-4xl">🖼️</span>
        <p className="text-sm text-slate-300">
          {state.isUploading ? "Uploading…" : "Click to upload or drag an image here"}
        </p>
        <p className="text-xs text-slate-500">PNG, JPEG, or WEBP</p>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_TYPES.join(",")}
          className="hidden"
          onChange={onInputChange}
        />
      </div>

      <div className="flex w-full max-w-md flex-col items-center gap-2.5">
        <p className="text-xs text-slate-500">Or start from a blank template</p>
        <div className="flex flex-wrap justify-center gap-2">
          {TEMPLATES.map((t) => (
            <button
              key={t.label}
              type="button"
              disabled={state.isUploading}
              onClick={() => handleTemplate(t)}
              className="rounded-md border border-slate-700 px-3 py-1.5 text-xs text-slate-300 transition hover:border-[#6366F1] hover:text-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {state.uploadError && (
        <p className="max-w-md text-center text-sm text-red-400" role="alert">
          {state.uploadError}
        </p>
      )}

      {state.backendOnline === false && (
        <p className="max-w-md text-center text-sm text-amber-400">
          The backend appears to be offline. Uploads won&apos;t work until it&apos;s running.
        </p>
      )}
    </div>
  );
}
