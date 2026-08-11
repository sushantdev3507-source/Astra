import { apiClient } from "./client";

interface HealthResponse {
  status: string;
  service: string;
}

export async function checkBackendHealth(): Promise<boolean> {
  try {
    const res = await apiClient.get<HealthResponse>("/api/v1/health", { timeoutMs: 5000 });
    return res.status === "ok";
  } catch {
    return false;
  }
}
