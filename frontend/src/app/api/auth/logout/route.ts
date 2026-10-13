import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, validateBffOrigin } from "@/lib/server/bff";

export async function POST(req: NextRequest) {
  if (!validateBffOrigin(req)) {
    return NextResponse.json(
      { detail: "Cross-origin request rejected." },
      { status: 403 }
    );
  }
  const response = NextResponse.json({ success: true });
  response.cookies.delete(SESSION_COOKIE_NAME);
  return response;
}
