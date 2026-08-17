import { requireRole } from "@/lib/auth-guard";
import { Role } from "@/generated/prisma/enums";
import { getEstate } from "@/lib/estate";
import { ensureDuesForYear, getPaymentDashboardTotals, listDuesForViewer } from "@/lib/services/dues";
import { formatNaira } from "@/lib/currency";
import { DUE_STATUS_DISPLAY } from "@/lib/due-status";
import { DashboardShell } from "@/components/DashboardShell";
import { StatTile } from "@/components/StatTile";

export default async function LandlordPaymentsPage() {
  const session = await requireRole([Role.LANDLORD]);
  const estate = await getEstate();
  const year = new Date().getFullYear();

  if (estate) {
    await ensureDuesForYear(estate.id, year);
  }

  const [totals, dues] = await Promise.all([
    getPaymentDashboardTotals(session, year),
    listDuesForViewer(session, year),
  ]);

  return (
    <DashboardShell estateName={estate?.name ?? ""} role="LANDLORD">
      <h1 className="text-2xl font-semibold text-slate-900">Payments</h1>
      <p className="mt-1 max-w-2xl text-slate-600">
        Payment status for your tenants, {year}.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatTile label="Active tenants" value={totals.totalActiveTenants} />
        <StatTile label="Paid" value={totals.paid} />
        <StatTile label="Payment submitted" value={totals.submitted} />
        <StatTile label="Outstanding" value={totals.outstanding} />
      </div>

      <div className="mt-6 overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-slate-600">House</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Tenant</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Space</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Amount</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {dues.map((due) => {
              const display = DUE_STATUS_DISPLAY[due.status];
              return (
                <tr key={due.id}>
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {due.tenant.house.houseNumber}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{due.tenant.fullName}</td>
                  <td className="px-4 py-3 text-slate-600">{due.tenant.livingSpaceType.name}</td>
                  <td className="px-4 py-3 text-slate-600">{formatNaira(due.amount)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${display.className}`}
                    >
                      {display.label}
                    </span>
                  </td>
                </tr>
              );
            })}
            {dues.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                  No tenants yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </DashboardShell>
  );
}
