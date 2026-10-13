import { NextRequest, NextResponse } from "next/server";
import {
  getBackendBaseUrl,
  SESSION_COOKIE_NAME,
} from "@/lib/server/bff";

type RouteContext = {
  params: Promise<{ path: string[] }>;
};

async function handleProxy(req: NextRequest, context: RouteContext) {
  try {
    const { path } = await context.params;
    if (!path || path.length === 0) {
      return NextResponse.json({ detail: "Missing target proxy path." }, { status: 400 });
    }

    const normalizedPath = path.join("/");

    // 1. Strict allowlist security check
    const isPublic = normalizedPath === "health" || normalizedPath === "ready";
    const isApiV1 = normalizedPath.startsWith("api/v1/");

    if (!isPublic && !isApiV1) {
      return NextResponse.json(
        { detail: "Target path is not permitted by API proxy." },
        { status: 403 }
      );
    }

    // 2. Validate session cookie for protected routes
    const sessionToken = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!isPublic && !sessionToken) {
      return NextResponse.json(
        { detail: "Authentication required. Please sign in." },
        { status: 401 }
      );
    }

    // 3. Assemble target backend URL
    const backendBase = getBackendBaseUrl();
    const query = req.nextUrl.search;
    const targetUrl = `${backendBase}/${normalizedPath}${query}`;

    // 4. Prepare forward headers
    const forwardHeaders = new Headers();
    const incomingContentType = req.headers.get("content-type");
    if (incomingContentType) {
      forwardHeaders.set("content-type", incomingContentType);
    }
    const incomingAccept = req.headers.get("accept");
    if (incomingAccept) {
      forwardHeaders.set("accept", incomingAccept);
    }

    // Server-managed bearer token injection
    if (sessionToken) {
      forwardHeaders.set("authorization", `Bearer ${sessionToken}`);
    }

    // 5. Read body for mutating requests
    const hasBody = !["GET", "HEAD"].includes(req.method);
    const bodyBuffer = hasBody ? await req.arrayBuffer() : undefined;

    const backendRes = await fetch(targetUrl, {
      method: req.method,
      headers: forwardHeaders,
      body: bodyBuffer,
      // @ts-expect-error Node/Next fetch duplex option for streaming buffer
      duplex: "half",
    });

    // 6. Assemble response headers preserving downloads and error types
    const responseHeaders = new Headers();
    const resContentType = backendRes.headers.get("content-type");
    if (resContentType) {
      responseHeaders.set("content-type", resContentType);
    }
    const contentDisposition = backendRes.headers.get("content-disposition");
    if (contentDisposition) {
      responseHeaders.set("content-disposition", contentDisposition);
    }
    const retryAfter = backendRes.headers.get("retry-after");
    if (retryAfter) {
      responseHeaders.set("retry-after", retryAfter);
    }

    const proxyResponse = new NextResponse(backendRes.body, {
      status: backendRes.status,
      headers: responseHeaders,
    });

    // Clear session cookie if backend rejected token as expired or revoked
    if (backendRes.status === 401 && !isPublic) {
      proxyResponse.cookies.delete(SESSION_COOKIE_NAME);
    }

    return proxyResponse;
  } catch (error: any) {
    return NextResponse.json(
      { detail: error?.message || "Failed to proxy request to backend service." },
      { status: 502 }
    );
  }
}

export async function GET(req: NextRequest, context: RouteContext) {
  return handleProxy(req, context);
}

export async function POST(req: NextRequest, context: RouteContext) {
  return handleProxy(req, context);
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  return handleProxy(req, context);
}

export async function PUT(req: NextRequest, context: RouteContext) {
  return handleProxy(req, context);
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  return handleProxy(req, context);
}

export async function HEAD(req: NextRequest, context: RouteContext) {
  return handleProxy(req, context);
}
