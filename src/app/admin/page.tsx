import { requireRole } from "@/lib/auth-guard";
import { getEstate } from "@/lib/estate";
import { prisma } from "@/lib/prisma";
import { Role } from "@/generated/prisma/enums";
import { DashboardShell } from "@/components/DashboardShell";

export default async function AdminDashboard() {
  const session = await requireRole([Role.ADMIN]);
  const estate = await getEstate();
  const user = await prisma.user.findUniqueOrThrow({ where: { id: session.userId } });

  return (
    <DashboardShell estateName={estate?.name ?? ""} role="ADMIN" personName={user.name ?? user.email ?? ""}>
      <h1 className="text-2xl font-semibold text-slate-900">Admin dashboard</h1>
      <p className="mt-2 max-w-2xl text-slate-600">
        You&apos;re signed in as Admin. This is a placeholder — Phase 2 adds houses,
        landlords, tenants and fee configuration; Phase 3 adds the defaulter dashboard
        described in the product spec.
      </p>
    </DashboardShell>
  );
}
