import "server-only";
import { prisma } from "@/lib/prisma";
import { Role } from "@/generated/prisma/enums";
import type { DueStatus } from "@/generated/prisma/enums";
import type { SessionPayload } from "@/lib/session";
import { ownLandlordId } from "./viewer-scope";

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
        status: "active",
        livingSpaceTypeId: filters.livingSpaceTypeId,
        houseId: filters.houseId,
        house: { landlordId },
      },
    },
    include: {
      tenant: { include: { house: { include: { landlord: true } }, livingSpaceType: true } },
      payments: { orderBy: { submittedAt: "desc" }, take: 1 },
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
    prisma.tenant.count({ where: { status: "active", house: { landlordId } } }),
    prisma.tenantDue.findMany({
      where: { year, tenant: { status: "active", house: { landlordId } } },
    }),
  ]);

  const paid = dues.filter((d) => d.status === "VALIDATED").length;
  const submitted = dues.filter((d) => d.status === "PAYMENT_SUBMITTED").length;
  const outstanding = dues.filter((d) => d.status === "NOT_PAID" || d.status === "REJECTED").length;
  const expectedCollection = dues.reduce((sum, d) => sum + d.amount, 0);
  const actualCollection = dues
    .filter((d) => d.status === "VALIDATED")
    .reduce((sum, d) => sum + d.amount, 0);

  return {
    totalActiveTenants,
    paid,
    submitted,
    outstanding,
    expectedCollection,
    actualCollection,
    tenantsWithoutDue: totalActiveTenants - dues.length,
  };
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

export function getDueForTenantYear(tenantId: string, year: number) {
  return prisma.tenantDue.findUnique({
    where: { tenantId_year: { tenantId, year } },
    include: { payments: { orderBy: { submittedAt: "desc" } } },
  });
}
