import "server-only";
import { prisma } from "@/lib/prisma";
import { Role } from "@/generated/prisma/enums";
import type { PaymentStatus } from "@/generated/prisma/enums";
import type { SessionPayload } from "@/lib/session";
import { ownLandlordId } from "./viewer-scope";

const PAYMENT_HISTORY_INCLUDE = {
  tenantDue: { include: { tenant: { include: { house: { include: { landlord: true } }, livingSpaceType: true } } } },
  validatedBy: true,
} as const;

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

function assertAdmin(session: SessionPayload) {
  if (session.role !== Role.ADMIN) {
    throw new Error("Only Admin can review payments.");
  }
}

// Admin's review queue — every payment awaiting a decision, oldest first so
// nothing sits unreviewed. Deliberately unscoped by landlord: only Admin can
// reach this (see docs/phase-0-discovery.md §6, "Validate/reject payments").
export function listPendingPayments() {
  return prisma.payment.findMany({
    where: { status: "SUBMITTED" },
    orderBy: { submittedAt: "asc" },
    include: PAYMENT_HISTORY_INCLUDE,
  });
}

async function getPendingPaymentOrThrow(paymentId: string) {
  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!payment) throw new Error("Payment not found.");
  if (payment.status !== "SUBMITTED") {
    throw new Error("This payment has already been reviewed.");
  }
  return payment;
}

export async function validatePayment(session: SessionPayload, paymentId: string, notes: string | null) {
  assertAdmin(session);
  const payment = await getPendingPaymentOrThrow(paymentId);

  await prisma.$transaction([
    prisma.payment.update({
      where: { id: paymentId },
      data: { status: "VALIDATED", notes, validatedById: session.userId, validatedAt: new Date() },
    }),
    prisma.tenantDue.update({ where: { id: payment.tenantDueId }, data: { status: "VALIDATED" } }),
  ]);
}

export async function rejectPayment(session: SessionPayload, paymentId: string, notes: string) {
  assertAdmin(session);
  if (!notes.trim()) {
    throw new Error("A reason is required when rejecting a payment.");
  }
  const payment = await getPendingPaymentOrThrow(paymentId);

  await prisma.$transaction([
    prisma.payment.update({
      where: { id: paymentId },
      data: { status: "REJECTED", notes, validatedById: session.userId, validatedAt: new Date() },
    }),
    prisma.tenantDue.update({ where: { id: payment.tenantDueId }, data: { status: "REJECTED" } }),
  ]);
}

// Cash is recorded and validated by Admin in one step — there's no separate
// review stage since Admin is confirming the cash in hand personally (see
// docs/phase-0-discovery.md §7, "Record cash payment"). Blocked while a bank
// transfer submission is already awaiting review for the same due, so Admin
// resolves that one first rather than creating two competing payment records.
export async function recordCashPayment(session: SessionPayload, tenantDueId: string, notes: string | null) {
  assertAdmin(session);
  const due = await prisma.tenantDue.findUniqueOrThrow({ where: { id: tenantDueId } });
  if (due.status === "VALIDATED") {
    throw new Error("This due is already paid.");
  }
  if (due.status === "PAYMENT_SUBMITTED") {
    throw new Error("A bank transfer is already awaiting review for this due — validate or reject it first.");
  }

  await prisma.$transaction([
    prisma.payment.create({
      data: {
        tenantDueId,
        method: "CASH",
        status: "VALIDATED",
        notes,
        validatedById: session.userId,
        validatedAt: new Date(),
      },
    }),
    prisma.tenantDue.update({ where: { id: tenantDueId }, data: { status: "VALIDATED" } }),
  ]);
}

export type PaymentHistoryFilters = {
  year?: number;
  houseId?: string;
  landlordId?: string;
  status?: PaymentStatus;
};

// ADMIN sees every payment attempt in the estate (optionally filtered);
// LANDLORD is scoped to their own tenants; TENANT to their own payments only
// — same scoping principle as listDuesForViewer in dues.ts.
export async function listPaymentHistoryForViewer(
  session: SessionPayload,
  filters: PaymentHistoryFilters = {}
) {
  if (session.role === Role.TENANT) {
    if (!session.tenantId) return [];
    return prisma.payment.findMany({
      where: { tenantDue: { tenantId: session.tenantId } },
      orderBy: { submittedAt: "desc" },
      include: PAYMENT_HISTORY_INCLUDE,
    });
  }

  const landlordId = session.role === Role.LANDLORD ? await ownLandlordId(session) : filters.landlordId;

  return prisma.payment.findMany({
    where: {
      status: filters.status,
      tenantDue: {
        year: filters.year,
        tenant: { houseId: filters.houseId, house: { landlordId } },
      },
    },
    orderBy: { submittedAt: "desc" },
    include: PAYMENT_HISTORY_INCLUDE,
  });
}
