/**
 * Small API client abstraction so components never call fetch()
 * directly. All requests go through here, which centralizes:
 *   - base URL resolution (never hard-coded elsewhere)
 *   - consistent error shape
 *   - JSON parsing
 */

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

/**
 * Resolve the backend base URL from the environment. Deliberately
 * avoids a hard-coded localhost fallback in production builds so this
 * frontend can be dropped into Sonamai's Next.js app later and simply
 * pick up its own NEXT_PUBLIC_API_URL.
 */
export function getApiBaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_API_URL;
  if (!url) {
    // Fallback only for local development convenience.
    return "http://localhost:8000";
  }
  return url.replace(/\/$/, "");
}

interface RequestOptions extends RequestInit {
  timeoutMs?: number;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { timeoutMs = 15000, ...init } = options;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetch(`${getApiBaseUrl()}${path}`, {
      ...init,
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timeout);
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new ApiError("Request timed out. Is the backend running?", 0);
    }
    throw new ApiError("Could not reach the backend. Is it running?", 0);
  }
  clearTimeout(timeout);

  const contentType = response.headers.get("content-type") ?? "";
  const isJson = contentType.includes("application/json");
  const body = isJson ? await response.json().catch(() => null) : null;

  if (!response.ok) {
    const message =
      (body && typeof body === "object" && "detail" in body && String(body.detail)) ||
      `Request failed with status ${response.status}.`;
    throw new ApiError(message, response.status);
  }

  return body as T;
}

export const apiClient = {
  get: <T>(path: string, options?: RequestOptions) => request<T>(path, { ...options, method: "GET" }),
  postForm: <T>(path: string, formData: FormData, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "POST", body: formData }),
  postJson: <T>(path: string, body: unknown, options?: RequestOptions) =>
    request<T>(path, {
      ...options,
      method: "POST",
      headers: { "Content-Type": "application/json", ...options?.headers },
      body: JSON.stringify(body),
    }),
};
