import { requireRole } from "@/lib/auth-guard";
import { getEstate } from "@/lib/estate";
import { prisma } from "@/lib/prisma";
import { Role } from "@/generated/prisma/enums";
import { DashboardShell } from "@/components/DashboardShell";

export default async function TenantDashboard() {
  const session = await requireRole([Role.TENANT]);
  const estate = await getEstate();
  const tenant = await prisma.tenant.findUniqueOrThrow({
    where: { id: session.tenantId },
    include: { house: true, livingSpaceType: true },
  });

  return (
    <DashboardShell estateName={estate?.name ?? ""} role="TENANT" personName={tenant.fullName}>
      <h1 className="text-2xl font-semibold text-slate-900">
        House {tenant.house.houseNumber} · {tenant.livingSpaceType.name}
      </h1>
      <p className="mt-2 max-w-2xl text-slate-600">
        You&apos;re signed in as a Tenant. This is a placeholder — Phase 3 adds your
        payment status, amount due, and payment submission here.
      </p>
    </DashboardShell>
  );
}
