import { requireRole } from "@/lib/auth-guard";
import { getEstate } from "@/lib/estate";
import { prisma } from "@/lib/prisma";
import { Role } from "@/generated/prisma/enums";
import { listHousesForViewer } from "@/lib/services/houses";
import { listTenantsForViewer } from "@/lib/services/tenants";
import { DashboardShell } from "@/components/DashboardShell";
import { StatTile } from "@/components/StatTile";

export default async function LandlordDashboard() {
  const session = await requireRole([Role.LANDLORD]);
  const estate = await getEstate();
  const landlord = await prisma.landlord.findUniqueOrThrow({
    where: { userId: session.userId },
  });

  const [houses, tenants] = await Promise.all([
    listHousesForViewer(session),
    listTenantsForViewer(session),
  ]);
  const activeTenants = tenants.filter((t) => t.status === "active");

  return (
    <DashboardShell estateName={estate?.name ?? ""} role="LANDLORD" personName={landlord.fullName}>
      <h1 className="text-2xl font-semibold text-slate-900">Landlord dashboard</h1>
      <p className="mt-2 max-w-2xl text-slate-600">
        Manage your houses and tenants. Payment status arrives in Phase 3.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <StatTile label="My houses" value={houses.length} href="/landlord/houses" />
        <StatTile label="Active tenants" value={activeTenants.length} href="/landlord/tenants" />
      </div>
    </DashboardShell>
  );
}
