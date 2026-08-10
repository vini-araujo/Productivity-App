const localApiUrl = "http://localhost:8000";

export function getApiBaseUrl(): string {
  const configuredUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, "");

  if (configuredUrl) {
    return configuredUrl;
  }

  if (process.env.NODE_ENV !== "production") {
    return localApiUrl;
  }

  throw new Error(
    "NEXT_PUBLIC_API_URL is required for production frontend builds.",
  );
}
