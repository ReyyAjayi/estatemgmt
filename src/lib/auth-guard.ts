import "server-only";
import { redirect } from "next/navigation";
import { getSession, type SessionPayload } from "@/lib/session";
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
  return session;
}
