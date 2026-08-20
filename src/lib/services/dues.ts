import "server-only";
import { prisma } from "@/lib/prisma";
import { Role } from "@/generated/prisma/enums";
import type { DueStatus } from "@/generated/prisma/enums";
import type { SessionPayload } from "@/lib/session";
import { ownLandlordId } from "./viewer-scope";
import { isOverdue } from "@/lib/promise-status";

// Idempotent: creates a TenantDue (with the fee amount snapshotted, per
// docs/phase-0-discovery.md §5) for every active tenant that doesn't already
// have one for `year`. Skips tenants whose living-space type has no fee
// configured for that year yet — there's nothing to bill them. Called from
// page loads rather than a cron job (see docs/phase-0-discovery.md §8) —
// cheap for single-estate MVP scale, and needs no background infrastructure.
export async function ensureDuesForYear(estateId: string, year: number) {
  const tenants = await prisma.tenant.findMany({
    where: { status: "active", house: { estateId } },
    select: { id: true, livingSpaceTypeId: true },
  });

  for (const tenant of tenants) {
    const existing = await prisma.tenantDue.findUnique({
      where: { tenantId_year: { tenantId: tenant.id, year } },
    });
    if (existing) continue;

    const fee = await prisma.fee.findUnique({
      where: { livingSpaceTypeId_year: { livingSpaceTypeId: tenant.livingSpaceTypeId, year } },
    });
    if (!fee) continue;

    await prisma.tenantDue.create({
      data: {
        tenantId: tenant.id,
        year,
        livingSpaceTypeId: tenant.livingSpaceTypeId,
        amount: fee.amount,
      },
    });
  }
}

export type DueFilters = {
  houseId?: string;
  landlordId?: string;
  livingSpaceTypeId?: string;
  status?: DueStatus;
};

// ADMIN sees every active tenant's due in the estate (optionally narrowed by
// the filters); LANDLORD is always scoped to their own tenants regardless of
// what filters are passed — see docs/phase-0-discovery.md §6.
export async function listDuesForViewer(
  session: SessionPayload,
  year: number,
  filters: DueFilters = {}
) {
  const landlordId =
    session.role === Role.LANDLORD ? await ownLandlordId(session) : filters.landlordId;

  const dues = await prisma.tenantDue.findMany({
    where: {
      year,
      status: filters.status,
      tenant: {
        userId: null, // excludes landlord-occupied units — see listLandlordUnitDues
        status: "active",
        livingSpaceTypeId: filters.livingSpaceTypeId,
        houseId: filters.houseId,
        house: { landlordId },
      },
    },
    include: {
      tenant: { include: { house: { include: { landlord: true } }, livingSpaceType: true } },
      payments: { orderBy: { submittedAt: "desc" }, take: 1 },
      certificate: true,
    },
  });

  return dues.sort((a, b) =>
    a.tenant.house.houseNumber.localeCompare(b.tenant.house.houseNumber) ||
    a.tenant.fullName.localeCompare(b.tenant.fullName)
  );
}

export async function getPaymentDashboardTotals(session: SessionPayload, year: number) {
  const landlordId = session.role === Role.LANDLORD ? await ownLandlordId(session) : undefined;

  const [totalActiveTenants, dues] = await Promise.all([
    prisma.tenant.count({ where: { userId: null, status: "active", house: { landlordId } } }),
    prisma.tenantDue.findMany({
      where: { year, tenant: { userId: null, status: "active", house: { landlordId } } },
    }),
  ]);

  const paid = dues.filter((d) => d.status === "VALIDATED").length;
  const submitted = dues.filter((d) => d.status === "PAYMENT_SUBMITTED").length;
  const outstanding = dues.filter((d) => d.status === "NOT_PAID" || d.status === "REJECTED").length;
  const overdue = dues.filter(isOverdue).length;
  const expectedCollection = dues.reduce((sum, d) => sum + d.amount, 0);
  const actualCollection = dues
    .filter((d) => d.status === "VALIDATED")
    .reduce((sum, d) => sum + d.amount, 0);

  return {
    totalActiveTenants,
    paid,
    submitted,
    outstanding,
    overdue,
    expectedCollection,
    actualCollection,
    tenantsWithoutDue: totalActiveTenants - dues.length,
  };
}

// Own due only, and only while it's still outstanding — matches the "shown
// when outstanding" screen note in docs/phase-0-discovery.md §7. Takes an
// explicit tenantId rather than a session/role, same as
// submitBankTransferPayment in payments.ts — a Landlord managing their own
// occupied unit (see createOwnUnitForLandlord in tenants.ts) uses this the
// same way a Tenant session does; the caller is responsible for resolving
// which tenantId it's allowed to act as.
export async function setExpectedPaymentDate(
  tenantId: string,
  tenantDueId: string,
  date: Date | null
) {
  const due = await prisma.tenantDue.findUniqueOrThrow({ where: { id: tenantDueId } });
  if (due.tenantId !== tenantId) {
    throw new Error("You can only update your own due.");
  }
  if (due.status !== "NOT_PAID" && due.status !== "REJECTED") {
    throw new Error("You can only provide an expected payment date while your due is outstanding.");
  }

  return prisma.tenantDue.update({
    where: { id: tenantDueId },
    data: { expectedPaymentDate: date },
  });
}

// Dues Admin can record a cash payment against — anything not already paid
// or already awaiting review for a bank-transfer submission (see
// recordCashPayment in payments.ts, which also enforces this server-side).
export async function listCashEligibleDues(estateId: string, year: number) {
  const dues = await prisma.tenantDue.findMany({
    where: {
      year,
      status: { in: ["NOT_PAID", "REJECTED"] },
      tenant: { status: "active", house: { estateId } },
    },
    include: { tenant: { include: { house: { include: { landlord: true } }, livingSpaceType: true } } },
  });

  return dues.sort((a, b) =>
    a.tenant.house.houseNumber.localeCompare(b.tenant.house.houseNumber) ||
    a.tenant.fullName.localeCompare(b.tenant.fullName)
  );
}

// Admin-only breakout of landlord-occupied units, kept separate from every
// other dues/totals function here on purpose (see the comment on
// listTenantsForViewer in tenants.ts) so landlord compliance never quietly
// blends into tenant compliance numbers.
export async function listLandlordUnitDues(estateId: string, year: number) {
  const dues = await prisma.tenantDue.findMany({
    where: {
      year,
      tenant: { userId: { not: null }, status: "active", house: { estateId } },
    },
    include: {
      tenant: { include: { house: { include: { landlord: true } }, livingSpaceType: true } },
      certificate: true,
    },
  });

  return dues.sort((a, b) => a.tenant.house.houseNumber.localeCompare(b.tenant.house.houseNumber));
}

export function getDueForTenantYear(tenantId: string, year: number) {
  return prisma.tenantDue.findUnique({
    where: { tenantId_year: { tenantId, year } },
    include: { payments: { orderBy: { submittedAt: "desc" } } },
  });
}
