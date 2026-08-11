"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { uploadAsset } from "@/lib/api/assets";
import { buildLaunchUrl } from "@/lib/integration/launchContext";
import { ApiError } from "@/lib/api/client";

/**
 * DEV-ONLY mock of "5onam.ai launches Astra with an asset reference."
 *
 * 5onam.ai's real launch flow does not exist yet. This page simulates
 * it locally: pick a file, it gets uploaded through Astra's own API
 * (standing in for "the asset already lives somewhere 5onam.ai can
 * reference"), then redirects to /editor?assetId=... exactly the way
 * an external host app would. This is how you verify the external
 * launch path without a real 5onam.ai integration.
 *
 * Not linked from anywhere in the main app UI on purpose.
 */
export default function LaunchAstraDevPage() {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "uploading" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setStatus("uploading");
    setError(null);
    try {
      const asset = await uploadAsset(file);
      const launchUrl = buildLaunchUrl("/editor", {
        assetId: asset.id,
        assetType: asset.type,
        fileName: asset.name,
        returnUrl: "/dev/launch-astra",
      });
      router.push(launchUrl.replace(window.location.origin, ""));
    } catch (err) {
      setStatus("error");
      setError(err instanceof ApiError ? err.message : "Upload failed.");
    }
  }

  return (
    <div className="flex h-dvh w-full flex-col items-center justify-center gap-6 bg-zinc-950 px-6 text-center">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-amber-500">Dev only</p>
        <h1 className="mt-1 text-2xl font-semibold text-zinc-100">Mock 5onam.ai Launch</h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-zinc-500">
          Simulates a host app launching Astra with an external asset reference
          (<code className="text-zinc-400">?assetId=...</code>). Pick a file below to stand in
          for &quot;an asset 5onam.ai already has&quot;, then Astra will open it exactly like a
          real launch would.
        </p>
      </div>

      <label className="cursor-pointer rounded-md bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-500">
        {status === "uploading" ? "Preparing asset…" : "Choose file & launch Astra"}
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          disabled={status === "uploading"}
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
      </label>

      {error && <p className="max-w-md text-sm text-red-400">{error}</p>}

      <p className="max-w-md text-xs text-zinc-600">
        This page is not linked from the main app. It exists purely to exercise the
        AstraLaunchContext integration path during development.
      </p>
    </div>
  );
}
