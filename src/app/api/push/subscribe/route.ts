import { getSession } from "@/lib/session";
import { Role } from "@/generated/prisma/enums";
import { saveSubscription } from "@/lib/services/push";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const endpoint = body?.endpoint;
  const p256dh = body?.keys?.p256dh;
  const auth = body?.keys?.auth;
  if (typeof endpoint !== "string" || typeof p256dh !== "string" || typeof auth !== "string") {
    return new Response("Invalid subscription.", { status: 400 });
  }

  const subjectId = session.role === Role.TENANT ? session.tenantId : session.userId;
  if (!subjectId) {
    return new Response("Session error.", { status: 400 });
  }

  await saveSubscription({ endpoint, p256dh, auth, role: session.role, subjectId });
  return new Response(null, { status: 204 });
}
