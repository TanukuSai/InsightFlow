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
    const { email, password, full_name } = body;

    if (!email || !password || !full_name) {
      return NextResponse.json(
        { detail: "Email, password, and full name are required." },
        { status: 400 }
      );
    }

    if (password.length < 12) {
      return NextResponse.json(
        { detail: "Password must be at least 12 characters long." },
        { status: 422 }
      );
    }

    const backendUrl = getBackendBaseUrl();
    const backendRes = await fetch(`${backendUrl}/api/v1/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-BFF-Secret": getBffSharedSecret(),
      },
      body: JSON.stringify({ email, password, full_name }),
    });

    const data = await backendRes.json().catch(() => null);

    if (!backendRes.ok) {
      const message =
        data?.detail || "Registration failed. Please review your input.";
      return NextResponse.json({ detail: message }, { status: backendRes.status });
    }

    const { access_token, user } = data;
    if (!access_token || !user) {
      return NextResponse.json(
        { detail: "Malformed registration response from server." },
        { status: 502 }
      );
    }

    const response = NextResponse.json({ user }, { status: 201 });
    response.cookies.set({
      ...getSessionCookieOptions(),
      value: access_token,
    });

    return response;
  } catch (error: any) {
    return NextResponse.json(
      { detail: error?.message || "Internal server error during registration." },
      { status: 500 }
    );
  }
}
