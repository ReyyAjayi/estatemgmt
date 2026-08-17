import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/session";

// Fast, optimistic redirect only — NOT the source of truth for access
// control. Each dashboard page calls requireRole() server-side, which is
// what actually verifies the session and enforces role checks; see
// docs/phase-0-discovery.md §6/§8 and the Next.js guidance that Proxy alone
// must never be relied on for authorization.
export function proxy(request: NextRequest) {
  const hasSession = request.cookies.has(SESSION_COOKIE_NAME);
  if (!hasSession) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/landlord/:path*", "/tenant/:path*", "/security/:path*"],
};
