import { NextRequest, NextResponse } from "next/server";
import {
  getBackendBaseUrl,
  SESSION_COOKIE_NAME,
} from "@/lib/server/bff";

export async function GET(req: NextRequest) {
  try {
    const sessionToken = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!sessionToken) {
      return NextResponse.json(
        { detail: "Authentication required. No session cookie." },
        { status: 401 }
      );
    }

    const backendUrl = getBackendBaseUrl();
    const backendRes = await fetch(`${backendUrl}/api/v1/auth/me`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${sessionToken}`,
      },
    });

    if (!backendRes.ok) {
      const response = NextResponse.json(
        { detail: "Session expired or invalid." },
        { status: 401 }
      );
      // Clear invalid cookie
      response.cookies.delete(SESSION_COOKIE_NAME);
      return response;
    }

    const user = await backendRes.json();
    return NextResponse.json({ user });
  } catch (error: any) {
    return NextResponse.json(
      { detail: error?.message || "Session verification failed." },
      { status: 500 }
    );
  }
}
