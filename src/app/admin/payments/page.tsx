import { requireRole } from "@/lib/auth-guard";
import { Role } from "@/generated/prisma/enums";
import type { DueStatus } from "@/generated/prisma/enums";
import { getEstate } from "@/lib/estate";
import {
  ensureDuesForYear,
  getPaymentDashboardTotals,
  listDuesForViewer,
} from "@/lib/services/dues";
import { listHousesForViewer } from "@/lib/services/houses";
import { listLandlords } from "@/lib/services/landlords";
import { listLivingSpaceTypes } from "@/lib/services/living-space-types";
import { formatNaira } from "@/lib/currency";
import { DUE_STATUS_DISPLAY, DUE_STATUS_OPTIONS } from "@/lib/due-status";
import { DashboardShell } from "@/components/DashboardShell";
import { StatTile } from "@/components/StatTile";
import { PaymentsSubNav } from "@/components/PaymentsSubNav";

function param(sp: { [key: string]: string | string[] | undefined }, key: string) {
  const value = sp[key];
  return typeof value === "string" && value ? value : undefined;
}

export default async function AdminPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await requireRole([Role.ADMIN]);
  const estate = await getEstate();
  const sp = await searchParams;

  const currentYear = new Date().getFullYear();
  const yearParam = param(sp, "year");
  const year = yearParam ? Number(yearParam) : currentYear;
  const houseId = param(sp, "houseId");
  const landlordId = param(sp, "landlordId");
  const livingSpaceTypeId = param(sp, "livingSpaceTypeId");
  const status = param(sp, "status") as DueStatus | undefined;

  if (estate) {
    await ensureDuesForYear(estate.id, year);
  }

  const [totals, dues, houses, landlords, spaceTypes] = await Promise.all([
    getPaymentDashboardTotals(session, year),
    listDuesForViewer(session, year, { houseId, landlordId, livingSpaceTypeId, status }),
    listHousesForViewer(session),
    listLandlords(),
    estate ? listLivingSpaceTypes(estate.id) : Promise.resolve([]),
  ]);

  const yearOptions = [currentYear - 1, currentYear, currentYear + 1];
  const hasFilters = houseId || landlordId || livingSpaceTypeId || status;

  return (
    <DashboardShell estateName={estate?.name ?? ""} role="ADMIN">
      <h1 className="text-2xl font-semibold text-slate-900">Payments</h1>
      <p className="mt-1 max-w-2xl text-slate-600">
        Who&apos;s paid, who hasn&apos;t, and what&apos;s outstanding for {year}.
      </p>
      <PaymentsSubNav role="ADMIN" active="dashboard" pendingCount={totals.submitted} />

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <StatTile label="Active tenants" value={totals.totalActiveTenants} />
        <StatTile label="Paid" value={totals.paid} />
        <StatTile label="Payment submitted" value={totals.submitted} />
        <StatTile label="Outstanding" value={totals.outstanding} />
        <StatTile label="Expected collection" value={formatNaira(totals.expectedCollection)} />
        <StatTile label="Actual collection" value={formatNaira(totals.actualCollection)} />
      </div>
      {totals.tenantsWithoutDue > 0 && (
        <p className="mt-2 text-sm text-amber-700">
          {totals.tenantsWithoutDue} active tenant{totals.tenantsWithoutDue === 1 ? "" : "s"} have
          no {year} fee configured for their living space type yet, so they aren&apos;t billed —
          check{" "}
          <a href="/admin/space-types" className="underline">
            Space types &amp; fees
          </a>
          .
        </p>
      )}

      <form method="get" className="mt-8 flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-4">
        <div>
          <label htmlFor="year" className="block text-sm font-medium text-slate-700">
            Year
          </label>
          <select
            id="year"
            name="year"
            defaultValue={String(year)}
            className="mt-1 block rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm"
          >
            {yearOptions.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="houseId" className="block text-sm font-medium text-slate-700">
            House
          </label>
          <select
            id="houseId"
            name="houseId"
            defaultValue={houseId ?? ""}
            className="mt-1 block rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm"
          >
            <option value="">All houses</option>
            {houses.map((h) => (
              <option key={h.id} value={h.id}>
                {h.houseNumber}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="landlordId" className="block text-sm font-medium text-slate-700">
            Landlord
          </label>
          <select
            id="landlordId"
            name="landlordId"
            defaultValue={landlordId ?? ""}
            className="mt-1 block rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm"
          >
            <option value="">All landlords</option>
            {landlords.map((l) => (
              <option key={l.id} value={l.id}>
                {l.fullName}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="livingSpaceTypeId" className="block text-sm font-medium text-slate-700">
            Living space
          </label>
          <select
            id="livingSpaceTypeId"
            name="livingSpaceTypeId"
            defaultValue={livingSpaceTypeId ?? ""}
            className="mt-1 block rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm"
          >
            <option value="">All types</option>
            {spaceTypes.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="status" className="block text-sm font-medium text-slate-700">
            Status
          </label>
          <select
            id="status"
            name="status"
            defaultValue={status ?? ""}
            className="mt-1 block rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm"
          >
            <option value="">All statuses</option>
            {DUE_STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800"
        >
          Filter
        </button>
        {hasFilters && (
          <a href="/admin/payments" className="text-sm text-slate-500 hover:underline">
            Clear filters
          </a>
        )}
      </form>

      <div className="mt-6 overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-slate-600">House</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Tenant</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Landlord</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Space</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Amount</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Status</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Proof</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Certificate</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {dues.map((due) => {
              const display = DUE_STATUS_DISPLAY[due.status];
              const latestPayment = due.payments[0];
              return (
                <tr key={due.id}>
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {due.tenant.house.houseNumber}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{due.tenant.fullName}</td>
                  <td className="px-4 py-3 text-slate-600">{due.tenant.house.landlord.fullName}</td>
                  <td className="px-4 py-3 text-slate-600">{due.tenant.livingSpaceType.name}</td>
                  <td className="px-4 py-3 text-slate-600">{formatNaira(due.amount)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${display.className}`}
                    >
                      {display.label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {latestPayment?.proofFileUrl ? (
                      <a
                        href={`/api/proofs/${latestPayment.proofFileUrl}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-slate-700 underline"
                      >
                        View
                      </a>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {due.certificate ? (
                      <a
                        href={`/verify/${due.certificate.qrToken}`}
                        className="text-slate-700 underline"
                      >
                        View
                      </a>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {dues.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-slate-500">
                  No tenants match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </DashboardShell>
  );
}
