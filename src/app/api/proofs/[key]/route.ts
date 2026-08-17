import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { readProofFile, proofFileContentType } from "@/lib/storage";
import { Role } from "@/generated/prisma/enums";

// Proof-of-payment images can contain bank account details, so this is
// gated the same way it would be behind a signed object-storage URL: only
// Admin, or the tenant who submitted it, can fetch it. See
// docs/phase-0-discovery.md §3 ("Proof-of-payment storage cost/privacy").
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ key: string }> }
) {
  const session = await getSession();
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { key } = await params;
  const payment = await prisma.payment.findFirst({
    where: { proofFileUrl: key },
    include: { tenantDue: true },
  });
  if (!payment) {
    return new Response("Not found", { status: 404 });
  }

  const isOwner = session.role === Role.TENANT && payment.tenantDue.tenantId === session.tenantId;
  const isAdmin = session.role === Role.ADMIN;
  if (!isOwner && !isAdmin) {
    return new Response("Forbidden", { status: 403 });
  }

  const buffer = await readProofFile(key);
  return new Response(new Uint8Array(buffer), {
    headers: { "Content-Type": proofFileContentType(key) },
  });
}
