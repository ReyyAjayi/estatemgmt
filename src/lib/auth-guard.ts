import "server-only";
import { redirect } from "next/navigation";
import { getSession, type SessionPayload } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { Role } from "@/generated/prisma/enums";

export function roleHome(role: Role): string {
  switch (role) {
    case Role.ADMIN:
      return "/admin";
    case Role.LANDLORD:
      return "/landlord";
    case Role.TENANT:
      return "/tenant";
    case Role.SECURITY:
      return "/security";
  }
}

// Sessions are self-contained signed JWTs (see session.ts) with no
// server-side store, so a session alone can't reflect a deactivation that
// happened after it was issued. Deactivating someone must take effect on
// their very next request, not just block their next login attempt --
// otherwise anyone already signed in keeps full access for up to the
// session's 7-day lifetime regardless. This is the per-request check that
// closes that gap. TENANT sessions carry a Tenant id as userId (tenants
// have no User row of their own -- see session.ts), so the two branches
// check different tables for the same reason.
//
// Exported so /login can run the same check: cookies() can only be
// mutated from a Server Action or Route Handler, never while rendering a
// Server Component page (Next.js throws if you try), so requireRole
// below can't clear a stale-but-still-cryptographically-valid cookie
// itself -- it can only redirect away from it. Without /login performing
// this same check, that stale cookie would still read as "logged in"
// there and bounce the deactivated user straight back to their
// dashboard, right into requireRole's redirect -- an infinite loop.
export async function isSessionSubjectActive(session: SessionPayload): Promise<boolean> {
  if (session.role === Role.TENANT) {
    const tenant = await prisma.tenant.findUnique({
      where: { id: session.userId },
      select: { status: true },
    });
    return tenant?.status === "active";
  }
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { status: true },
  });
  return user?.status === "active";
}

// Server-side gate for every dashboard page. This — not the proxy layer, and
// never the UI alone — is the real enforcement point for role access.
export async function requireRole(allowed: Role[]): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  if (!allowed.includes(session.role)) {
    redirect(roleHome(session.role));
  }
  if (!(await isSessionSubjectActive(session))) {
    redirect("/login");
  }
  return session;
}
