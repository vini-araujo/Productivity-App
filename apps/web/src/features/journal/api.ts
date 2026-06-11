import { getSupabaseClient } from "@/lib/supabase";

import type {
  JournalEntry,
  JournalEntryList,
  JournalEntryUpdate,
  JournalEntryWrite,
} from "./types";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

function errorDetail(detail: unknown): string {
  if (typeof detail === "string") {
    return detail;
  }
  if (!Array.isArray(detail)) {
    return "Journal request failed";
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
  return messages.length > 0 ? messages.join("; ") : "Journal request failed";
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

export function getTodayEntry(entryDate: string): Promise<JournalEntry | null> {
  return request<JournalEntry | null>(
    `/api/v1/journal/entries/today?entry_date=${entryDate}`,
  );
}

export function saveTodayEntry(
  entryDate: string,
  data: JournalEntryWrite,
): Promise<JournalEntry> {
  return request<JournalEntry>(
    `/api/v1/journal/entries/today?entry_date=${entryDate}`,
    {
      method: "PUT",
      body: JSON.stringify(data),
    },
  );
}

export function listJournalEntries(
  limit: number,
  offset: number,
  search: string,
): Promise<JournalEntryList> {
  const query = new URLSearchParams({
    limit: limit.toString(),
    offset: offset.toString(),
  });
  if (search.trim()) {
    query.set("search", search.trim());
  }
  return request<JournalEntryList>(
    `/api/v1/journal/entries?${query.toString()}`,
  );
}

export function updateJournalEntry(
  entryId: string,
  changes: JournalEntryUpdate,
): Promise<JournalEntry> {
  return request<JournalEntry>(`/api/v1/journal/entries/${entryId}`, {
    method: "PATCH",
    body: JSON.stringify(changes),
  });
}

export function deleteJournalEntry(entryId: string): Promise<void> {
  return request<void>(`/api/v1/journal/entries/${entryId}`, {
    method: "DELETE",
  });
}
