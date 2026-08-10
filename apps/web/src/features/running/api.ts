import { getApiBaseUrl } from "@/lib/api";
import { getSupabaseClient } from "@/lib/supabase";

import type { Run, RunList, RunUpdate, RunWrite } from "./types";

const apiUrl = getApiBaseUrl();

function errorDetail(detail: unknown): string {
  if (typeof detail === "string") {
    return detail;
  }
  if (!Array.isArray(detail)) {
    return "Could not update your runs";
  }
  const messages = detail.flatMap((item) => {
    if (!item || typeof item !== "object") {
      return [];
    }
    const validationError = item as { loc?: unknown; msg?: unknown };
    if (typeof validationError.msg !== "string") {
      return [];
    }
    const location = Array.isArray(validationError.loc)
      ? validationError.loc
          .filter((part) => part !== "body")
          .map(String)
          .join(".")
      : "";
    return [
      location ? `${location}: ${validationError.msg}` : validationError.msg,
    ];
  });
  return messages.length > 0
    ? messages.join("; ")
    : "Could not update your runs";
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const {
    data: { session },
  } = await getSupabaseClient().auth.getSession();
  if (!session) {
    throw new Error("Authentication required");
  }
  const response = await fetch(`${apiUrl}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      detail?: unknown;
    } | null;
    throw new Error(errorDetail(body?.detail));
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}

export function listRuns(limit: number, offset: number): Promise<RunList> {
  return request<RunList>(`/api/v1/runs?limit=${limit}&offset=${offset}`);
}

export function createRun(data: RunWrite): Promise<Run> {
  return request<Run>("/api/v1/runs", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateRun(runId: string, data: RunUpdate): Promise<Run> {
  return request<Run>(`/api/v1/runs/${runId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function deleteRun(runId: string): Promise<void> {
  return request<void>(`/api/v1/runs/${runId}`, { method: "DELETE" });
}
