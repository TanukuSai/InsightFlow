import { NextRequest } from "next/server";

export const SESSION_COOKIE_NAME = "insightflow_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days in seconds

export function getBackendBaseUrl(): string {
  const isProduction = process.env.NODE_ENV === "production";
  const configured = process.env.INSIGHTFLOW_BACKEND_URL?.trim();

  if (configured) {
    try {
      const parsed = new URL(configured);
      if (isProduction && parsed.protocol !== "https:") {
        throw new Error("INSIGHTFLOW_BACKEND_URL must use https in production.");
      }
      if (!isProduction && parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        throw new Error("Invalid protocol for INSIGHTFLOW_BACKEND_URL.");
      }
      return configured.replace(/\/+$/, "");
    } catch {
      if (isProduction) {
        throw new Error("Invalid or insecure INSIGHTFLOW_BACKEND_URL configured.");
      }
    }
  }

  if (isProduction) {
    throw new Error("INSIGHTFLOW_BACKEND_URL must be configured in production environment.");
  }

  return "http://127.0.0.1:8000";
}

export function getBffSharedSecret(): string {
  const secret = process.env.INSIGHTFLOW_BFF_SHARED_SECRET?.trim();
  if (secret) {
    return secret;
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error("INSIGHTFLOW_BFF_SHARED_SECRET must be configured in production environment.");
  }
  return "dev-bff-secret-insightflow-entropy-min-32-chars";
}

export function validateBffOrigin(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  const host = req.headers.get("host") || req.nextUrl.host;

  if (origin) {
    try {
      const originHost = new URL(origin).host;
      return originHost === host;
    } catch {
      return false;
    }
  }

  // Fallback to referer for same-site non-GET navigations
  const referer = req.headers.get("referer");
  if (referer) {
    try {
      const refererHost = new URL(referer).host;
      return refererHost === host;
    } catch {
      return false;
    }
  }

  // In development, allow API testing tools without browser origin
  return process.env.NODE_ENV !== "production";
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
