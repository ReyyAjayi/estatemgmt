import { requireRole } from "@/lib/auth-guard";
import { getEstate } from "@/lib/estate";
import { prisma } from "@/lib/prisma";
import { Role } from "@/generated/prisma/enums";
import { listHousesForViewer } from "@/lib/services/houses";
import { listLandlords } from "@/lib/services/landlords";
import { ensureDuesForYear, getPaymentDashboardTotals } from "@/lib/services/dues";
import { DashboardShell } from "@/components/DashboardShell";
import { StatTile } from "@/components/StatTile";

export default async function AdminDashboard() {
  const session = await requireRole([Role.ADMIN]);
  const estate = await getEstate();
  const user = await prisma.user.findUniqueOrThrow({ where: { id: session.userId } });

  const year = new Date().getFullYear();
  if (estate) {
    await ensureDuesForYear(estate.id, year);
  }

  const [houses, landlords, totals] = await Promise.all([
    listHousesForViewer(session),
    listLandlords(),
    getPaymentDashboardTotals(session, year),
  ]);

  return (
    <DashboardShell
      estateName={estate?.name ?? ""}
      role="ADMIN"
      personName={user.name ?? user.email ?? ""}
    >
      <h1 className="text-2xl font-semibold text-slate-900">Admin dashboard</h1>
      <p className="mt-2 max-w-2xl text-slate-600">
        {totals.outstanding} tenant{totals.outstanding === 1 ? "" : "s"} still owe {year}&apos;s
        due. See the full breakdown on the{" "}
        <a href="/admin/payments" className="underline">
          Payments
        </a>{" "}
        page.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatTile label="Houses" value={houses.length} href="/admin/houses" />
        <StatTile label="Landlords" value={landlords.length} href="/admin/landlords" />
        <StatTile label="Active tenants" value={totals.totalActiveTenants} href="/admin/tenants" />
        <StatTile label="Outstanding" value={totals.outstanding} href="/admin/payments" />
      </div>
    </DashboardShell>
  );
}
