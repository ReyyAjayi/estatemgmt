import "server-only";
import { prisma } from "@/lib/prisma";

// Cash isn't self-service — Admin records it (Phase 4). This is the tenant's
// only submission path: bank transfer + proof. Blocked while a submission is
// already pending review or already validated; allowed again after a
// rejection, per docs/phase-0-discovery.md §2.4 (resubmission).
export async function submitBankTransferPayment(
  tenantDueId: string,
  tenantId: string,
  input: { referenceNumber: string | null; proofKey: string }
) {
  const due = await prisma.tenantDue.findUniqueOrThrow({ where: { id: tenantDueId } });
  if (due.tenantId !== tenantId) {
    throw new Error("You can only submit payment for your own due.");
  }
  if (due.status === "PAYMENT_SUBMITTED") {
    throw new Error("A payment is already awaiting review for this year.");
  }
  if (due.status === "VALIDATED") {
    throw new Error("This year is already paid.");
  }

  await prisma.$transaction([
    prisma.payment.create({
      data: {
        tenantDueId,
        method: "BANK_TRANSFER",
        referenceNumber: input.referenceNumber,
        proofFileUrl: input.proofKey,
        status: "SUBMITTED",
      },
    }),
    prisma.tenantDue.update({ where: { id: tenantDueId }, data: { status: "PAYMENT_SUBMITTED" } }),
  ]);
}
