const technicalErrorMarkers = [
  "failed to fetch",
  "networkerror",
  "network request failed",
  "next_public",
  "api_url",
  "supabase",
  "fastapi",
  "jwt",
];

export function customerError(error: unknown, fallback: string): string {
  if (!(error instanceof Error)) {
    return fallback;
  }

  const message = error.message.trim();
  if (!message) {
    return fallback;
  }

  const normalized = message.toLowerCase();
  if (technicalErrorMarkers.some((marker) => normalized.includes(marker))) {
    return fallback;
  }

  return message;
}
