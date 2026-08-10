import { getApiBaseUrl } from "@/lib/api";
import { getSupabaseClient } from "@/lib/supabase";

import type { DashboardSnapshot } from "./types";

const apiUrl = getApiBaseUrl();

function errorDetail(detail: unknown): string {
  if (typeof detail === "string") {
    return detail;
  }
  if (!Array.isArray(detail)) {
    return "Could not load your dashboard";
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
    : "Could not load your dashboard";
}

export async function getDashboard(
  localDate: string,
): Promise<DashboardSnapshot> {
  const {
    data: { session },
  } = await getSupabaseClient().auth.getSession();
  if (!session) {
    throw new Error("Authentication required");
  }
  const response = await fetch(
    `${apiUrl}/api/v1/dashboard?local_date=${localDate}`,
    {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    },
  );
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      detail?: unknown;
    } | null;
    throw new Error(errorDetail(body?.detail));
  }
  return (await response.json()) as DashboardSnapshot;
}
