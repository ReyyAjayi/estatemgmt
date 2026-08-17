import { requireRole } from "@/lib/auth-guard";
import { getEstate } from "@/lib/estate";
import { prisma } from "@/lib/prisma";
import { Role } from "@/generated/prisma/enums";
import { listHousesForViewer } from "@/lib/services/houses";
import { listTenantsForViewer } from "@/lib/services/tenants";
import { listLandlords } from "@/lib/services/landlords";
import { DashboardShell } from "@/components/DashboardShell";
import { StatTile } from "@/components/StatTile";

export default async function AdminDashboard() {
  const session = await requireRole([Role.ADMIN]);
  const estate = await getEstate();
  const user = await prisma.user.findUniqueOrThrow({ where: { id: session.userId } });

  const [houses, tenants, landlords] = await Promise.all([
    listHousesForViewer(session),
    listTenantsForViewer(session),
    listLandlords(),
  ]);

  const activeTenants = tenants.filter((t) => t.status === "active");
  const pendingDeactivations = tenants.filter((t) => t.deactivationRequestedAt !== null);

  return (
    <DashboardShell
      estateName={estate?.name ?? ""}
      role="ADMIN"
      personName={user.name ?? user.email ?? ""}
    >
      <h1 className="text-2xl font-semibold text-slate-900">Admin dashboard</h1>
      <p className="mt-2 max-w-2xl text-slate-600">
        Payment status and defaulter tracking arrive in Phase 3. For now, set up your estate&apos;s
        houses, landlords, tenants and fees.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatTile label="Houses" value={houses.length} href="/admin/houses" />
        <StatTile label="Landlords" value={landlords.length} href="/admin/landlords" />
        <StatTile label="Active tenants" value={activeTenants.length} href="/admin/tenants" />
        <StatTile
          label="Pending deactivation requests"
          value={pendingDeactivations.length}
          href="/admin/tenants"
        />
      </div>
    </DashboardShell>
  );
}
