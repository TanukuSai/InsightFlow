export const SESSION_COOKIE_NAME = "insightflow_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days in seconds

export function getBackendBaseUrl(): string {
  const configured =
    process.env.INSIGHTFLOW_BACKEND_URL?.trim() ||
    process.env.NEXT_PUBLIC_API_BASE_URL?.trim();

  if (configured) {
    return configured.replace(/\/+$/, "");
  }

  if (process.env.NODE_ENV === "production") {
    return "https://insightflow-backend-aw26.onrender.com";
  }

  return "http://127.0.0.1:8000";
}

export function getSessionCookieOptions() {
  const isProduction = process.env.NODE_ENV === "production";
  return {
    name: SESSION_COOKIE_NAME,
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_MAX_AGE,
  };
}
