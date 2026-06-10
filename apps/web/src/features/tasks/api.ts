import { getSupabaseClient } from "@/lib/supabase";

import type {
  Task,
  TaskCreate,
  TaskFilter,
  TaskList,
  TaskUpdate,
} from "./types";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

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
      detail?: string;
    } | null;
    throw new Error(body?.detail ?? "Task request failed");
  }

  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}

export function listTasks(
  filter: TaskFilter,
  limit: number,
  offset: number,
): Promise<TaskList> {
  const query = new URLSearchParams({
    limit: limit.toString(),
    offset: offset.toString(),
  });
  if (filter !== "all") {
    query.set("completed", filter === "completed" ? "true" : "false");
  }
  return request<TaskList>(`/api/v1/tasks?${query.toString()}`);
}

export function createTask(data: TaskCreate): Promise<Task> {
  return request<Task>("/api/v1/tasks", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateTask(taskId: string, changes: TaskUpdate): Promise<Task> {
  return request<Task>(`/api/v1/tasks/${taskId}`, {
    method: "PATCH",
    body: JSON.stringify(changes),
  });
}

export function deleteTask(taskId: string): Promise<void> {
  return request<void>(`/api/v1/tasks/${taskId}`, { method: "DELETE" });
}
