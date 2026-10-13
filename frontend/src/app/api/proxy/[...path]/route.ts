import { NextRequest, NextResponse } from "next/server";
import {
  getBackendBaseUrl,
  SESSION_COOKIE_NAME,
  validateBffOrigin,
} from "@/lib/server/bff";

type RouteContext = {
  params: Promise<{ path: string[] }>;
};

const ALLOWED_ROUTE_PREFIXES = [
  "health",
  "ready",
  "api/v1/datasets",
  "api/v1/feedback",
  "api/v1/issues",
  "api/v1/recommendations",
  "api/v1/reports",
  "api/v1/adaption",
];

const ALLOWED_METHODS = new Set(["GET", "POST", "PATCH", "PUT", "DELETE", "HEAD"]);

async function handleProxy(req: NextRequest, context: RouteContext) {
  try {
    // 1. Method verification
    if (!ALLOWED_METHODS.has(req.method)) {
      return NextResponse.json(
        { detail: `HTTP method ${req.method} is not permitted.` },
        { status: 405 }
      );
    }

    // 2. Origin check on state-changing requests
    if (!["GET", "HEAD"].includes(req.method)) {
      if (!validateBffOrigin(req)) {
        return NextResponse.json(
          { detail: "Cross-origin mutation rejected." },
          { status: 403 }
        );
      }
    }

    const { path } = await context.params;
    if (!path || path.length === 0) {
      return NextResponse.json({ detail: "Missing target proxy path." }, { status: 400 });
    }

    // 3. Traversal and injection defense
    for (const segment of path) {
      const decoded = decodeURIComponent(segment);
      if (
        decoded.includes("..") ||
        decoded.includes("/") ||
        decoded.includes("\\") ||
        decoded.includes("\0") ||
        segment.toLowerCase().includes("%2e") ||
        segment.toLowerCase().includes("%2f") ||
        segment.toLowerCase().includes("%5c")
      ) {
        return NextResponse.json(
          { detail: "Path traversal or malformed path sequence rejected." },
          { status: 400 }
        );
      }
    }

    const normalizedPath = path.join("/");

    // 4. Explicit rejection of auth paths through generic proxy
    if (normalizedPath.startsWith("api/v1/auth")) {
      return NextResponse.json(
        { detail: "Direct proxying of auth endpoints is not allowed. Use BFF auth routes." },
        { status: 403 }
      );
    }

    // 5. Strict allowlist verification
    const isAllowed = ALLOWED_ROUTE_PREFIXES.some(
      (prefix) => normalizedPath === prefix || normalizedPath.startsWith(`${prefix}/`)
    );

    if (!isAllowed) {
      return NextResponse.json(
        { detail: "Target path is not permitted by API proxy." },
        { status: 403 }
      );
    }

    const isPublic = normalizedPath === "health" || normalizedPath === "ready";

    // 6. Validate session cookie for protected routes
    const sessionToken = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!isPublic && !sessionToken) {
      return NextResponse.json(
        { detail: "Authentication required. Please sign in." },
        { status: 401 }
      );
    }

    // 7. Assemble target backend URL safely
    const backendBase = getBackendBaseUrl();
    const query = req.nextUrl.search;
    const targetUrl = `${backendBase}/${normalizedPath}${query}`;

    // 8. Prepare forward headers (never forward arbitrary browser auth or tenant headers)
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

    // 9. Read body for mutating requests
    const hasBody = !["GET", "HEAD"].includes(req.method);
    const bodyBuffer = hasBody ? await req.arrayBuffer() : undefined;

    const backendRes = await fetch(targetUrl, {
      method: req.method,
      headers: forwardHeaders,
      body: bodyBuffer,
      // @ts-expect-error Node/Next fetch duplex option for streaming buffer
      duplex: "half",
    });

    // 10. Assemble response headers preserving downloads and error types
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
