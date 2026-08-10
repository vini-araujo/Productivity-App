import { getApiBaseUrl } from "@/lib/api";
import { getSupabaseClient } from "@/lib/supabase";

import type {
  Exercise,
  PlanCreate,
  WorkoutPlan,
  WorkoutSession,
  WorkoutSet,
} from "./types";

const apiUrl = getApiBaseUrl();

function errorDetail(detail: unknown): string {
  if (typeof detail === "string") {
    return detail;
  }
  if (!Array.isArray(detail)) {
    return "Could not update your workouts";
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
    : "Could not update your workouts";
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

export function listExercises(): Promise<Exercise[]> {
  return request<Exercise[]>("/api/v1/workouts/exercises");
}

export function createExercise(data: {
  name: string;
  muscle_group?: string | null;
}): Promise<Exercise> {
  return request<Exercise>("/api/v1/workouts/exercises", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function listPlans(): Promise<WorkoutPlan[]> {
  return request<WorkoutPlan[]>("/api/v1/workouts/plans");
}

export function createPlan(data: PlanCreate): Promise<WorkoutPlan> {
  return request<WorkoutPlan>("/api/v1/workouts/plans", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updatePlan(
  planId: string,
  data: PlanCreate,
): Promise<WorkoutPlan> {
  return request<WorkoutPlan>(`/api/v1/workouts/plans/${planId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export function clonePlan(planId: string): Promise<WorkoutPlan> {
  return request<WorkoutPlan>(`/api/v1/workouts/plans/${planId}/clone`, {
    method: "POST",
  });
}

export function startWorkout(
  planId: string,
  dayId: string,
): Promise<WorkoutSession> {
  return request<WorkoutSession>(
    `/api/v1/workouts/plans/${planId}/days/${dayId}/start`,
    { method: "POST" },
  );
}

export function listSessions(limit = 100): Promise<WorkoutSession[]> {
  return request<WorkoutSession[]>(`/api/v1/workouts/sessions?limit=${limit}`);
}

export function updateWorkout(
  sessionId: string,
  changes: { notes?: string | null; completed?: boolean },
): Promise<WorkoutSession> {
  return request<WorkoutSession>(`/api/v1/workouts/sessions/${sessionId}`, {
    method: "PATCH",
    body: JSON.stringify(changes),
  });
}

export function deleteWorkout(sessionId: string): Promise<void> {
  return request<void>(`/api/v1/workouts/sessions/${sessionId}`, {
    method: "DELETE",
  });
}

export function updateWorkoutSet(
  setId: string,
  changes: {
    weight?: number | null;
    repetitions?: number | null;
    reached_failure?: boolean;
  },
): Promise<WorkoutSet> {
  return request<WorkoutSet>(`/api/v1/workouts/sets/${setId}`, {
    method: "PATCH",
    body: JSON.stringify(changes),
  });
}
