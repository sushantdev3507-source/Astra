"use client";

import { ChangeEvent, DragEvent, useRef, useState } from "react";
import { useEditor } from "@/lib/editor/EditorProvider";
import { uploadAsset } from "@/lib/api/assets";
import { ApiError } from "@/lib/api/client";

const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp"];

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
