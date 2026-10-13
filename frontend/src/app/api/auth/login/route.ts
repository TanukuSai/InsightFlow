import { NextRequest, NextResponse } from "next/server";
import {
  getBackendBaseUrl,
  getSessionCookieOptions,
  getBffSharedSecret,
  validateBffOrigin,
} from "@/lib/server/bff";

export async function POST(req: NextRequest) {
  try {
    if (!validateBffOrigin(req)) {
      return NextResponse.json(
        { detail: "Cross-origin request rejected." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { detail: "Email and password are required." },
        { status: 400 }
      );
    }

    const backendUrl = getBackendBaseUrl();
    const backendRes = await fetch(`${backendUrl}/api/v1/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-BFF-Secret": getBffSharedSecret(),
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await backendRes.json().catch(() => null);

    if (!backendRes.ok) {
      const message =
        data?.detail || "Authentication failed. Please check your credentials.";
      return NextResponse.json({ detail: message }, { status: backendRes.status });
    }

    const { access_token, user } = data;
    if (!access_token || !user) {
      return NextResponse.json(
        { detail: "Malformed authentication response from server." },
        { status: 502 }
      );
    }

    const response = NextResponse.json({ user });
    response.cookies.set({
      ...getSessionCookieOptions(),
      value: access_token,
    });

    return response;
  } catch (error: any) {
    return NextResponse.json(
      { detail: error?.message || "Internal server error during authentication." },
      { status: 500 }
    );
  }
}
