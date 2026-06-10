import { getSupabaseClient } from "@/lib/supabase";

import type { Profile, ProfileUpdate } from "./types";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function requestProfile(
  method: "GET" | "PATCH",
  changes?: ProfileUpdate,
): Promise<Profile> {
  const {
    data: { session },
  } = await getSupabaseClient().auth.getSession();

  if (!session) {
    throw new Error("Authentication required");
  }

  const response = await fetch(`${apiUrl}/api/v1/me`, {
    method,
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      "Content-Type": "application/json",
    },
    body: changes ? JSON.stringify(changes) : undefined,
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      detail?: string;
    } | null;
    throw new Error(body?.detail ?? "Profile request failed");
  }

  return (await response.json()) as Profile;
}

export function getProfile(): Promise<Profile> {
  return requestProfile("GET");
}

export function updateProfile(changes: ProfileUpdate): Promise<Profile> {
  return requestProfile("PATCH", changes);
}
