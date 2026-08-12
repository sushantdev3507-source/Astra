import { ApiError, apiClient, getApiBaseUrl } from "@/lib/api/client";

export interface InpaintResponse {
  success: boolean;
  resultAssetId?: string;
  url?: string;
  provider?: string;
  latencyMs?: number;
  error?: string;
}

export type JobStatus = "queued" | "processing" | "completed" | "failed";

interface JobCreateResponse {
  job_id: string;
  status: JobStatus;
}

export interface JobStatusResponse {
  job_id: string;
  status: JobStatus;
  result?: InpaintResponse;
  error?: string;
}

export interface AiProviderStatus {
  provider: "mock" | "real" | "gemini";
  configured: boolean;
  model?: string | null;
  supportsMaskless?: boolean;
}

/** Fine-grained progress states surfaced to the UI (Sprint 4 Track B). */
export type InpaintProgress = "uploading" | "queued" | "generating" | "processing-result";

const POLL_INTERVAL_MS = 700;
const MAX_POLL_MS = 150000; // generous -- real models can be slow; matches backend's own timeout + margin

/**
 * Calls Astra's own async AI job API -- NOT a Sonal.ai or third-party
 * AI endpoint. Creates a job (POST /api/v1/inpaint -> 202 + job_id),
 * then polls GET /api/v1/jobs/{job_id} until it reaches a terminal
 * state, reporting progress via onProgress along the way. See
 * backend/app/api/jobs.py.
 */
export async function requestInpaint(
  imageBlob: Blob,
  maskBlob: Blob | null,
  prompt: string,
  featherRadius?: number,
  onProgress?: (stage: InpaintProgress) => void,
  onJobCreated?: (jobId: string) => void
): Promise<InpaintResponse> {
  onProgress?.("uploading");

  const formData = new FormData();
  formData.append("image", imageBlob, "image.png");
  // mask is OPTIONAL (Gemini Integration Sprint) -- omitted entirely
  // for an instruction-only edit with no painted region.
  if (maskBlob) {
    formData.append("mask", maskBlob, "mask.png");
  }
  formData.append("prompt", prompt);
  if (featherRadius !== undefined) {
    formData.append("feather_radius", String(featherRadius));
  }

  let createResponse: Response;
  try {
    createResponse = await fetch(`${getApiBaseUrl()}/api/v1/inpaint`, {
      method: "POST",
      body: formData,
    });
  } catch {
    throw new ApiError("Could not reach the backend. Is it running?", 0);
  }

  const createBody = await createResponse.json().catch(() => null);
  if (!createResponse.ok) {
    const detail = (createBody && typeof createBody === "object" && "detail" in createBody)
      ? String(createBody.detail)
      : `Request failed with status ${createResponse.status}.`;
    throw new ApiError(detail, createResponse.status);
  }

  const { job_id: jobId } = createBody as JobCreateResponse;
  onJobCreated?.(jobId);
  onProgress?.("queued");

  const deadline = Date.now() + MAX_POLL_MS;
  let lastStatus: JobStatus | null = null;

  while (Date.now() < deadline) {
    await sleep(POLL_INTERVAL_MS);

    let statusResp: JobStatusResponse;
    try {
      statusResp = await apiClient.get<JobStatusResponse>(`/api/v1/jobs/${jobId}`, { timeoutMs: 10000 });
    } catch {
      // A single transient poll failure shouldn't kill the whole
      // generation -- keep trying until the deadline.
      continue;
    }

    if (statusResp.status !== lastStatus) {
      lastStatus = statusResp.status;
      if (statusResp.status === "processing") onProgress?.("generating");
    }

    if (statusResp.status === "completed") {
      onProgress?.("processing-result");
      return statusResp.result ?? { success: false, error: "Job completed with no result." };
    }
    if (statusResp.status === "failed") {
      return { success: false, error: statusResp.error ?? "AI generation failed." };
    }
    // queued / processing -- keep polling
  }

  throw new ApiError("AI generation timed out. Please try again.", 0);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * A single, non-polling status check -- used by session recovery
 * (Sprint 4 Track D) to find out what happened to a job that was
 * still in flight when the page was last closed/refreshed, WITHOUT
 * resubmitting a new generation request.
 */
export async function checkJobStatusOnce(jobId: string): Promise<JobStatusResponse | null> {
  try {
    return await apiClient.get<JobStatusResponse>(`/api/v1/jobs/${jobId}`, { timeoutMs: 8000 });
  } catch {
    return null;
  }
}

/** Which AI provider is actually active -- mock, or real (and whether it's actually configured). */
export async function getAiProviderStatus(): Promise<AiProviderStatus> {
  return apiClient.get<AiProviderStatus>("/api/v1/ai/status", { timeoutMs: 5000 });
}
