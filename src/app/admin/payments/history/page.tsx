import { requireRole } from "@/lib/auth-guard";
import { Role } from "@/generated/prisma/enums";
import type { PaymentStatus } from "@/generated/prisma/enums";
import { getEstate } from "@/lib/estate";
import { listPaymentHistoryForViewer } from "@/lib/services/payments";
import { listHousesForViewer } from "@/lib/services/houses";
import { listLandlords } from "@/lib/services/landlords";
import { formatNaira } from "@/lib/currency";
import { PAYMENT_STATUS_DISPLAY, PAYMENT_STATUS_OPTIONS } from "@/lib/payment-status";
import { DashboardShell } from "@/components/DashboardShell";
import { PaymentsSubNav } from "@/components/PaymentsSubNav";

function param(sp: { [key: string]: string | string[] | undefined }, key: string) {
  const value = sp[key];
  return typeof value === "string" && value ? value : undefined;
}

export default async function AdminPaymentHistoryPage({
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
  const status = param(sp, "status") as PaymentStatus | undefined;

  const [payments, houses, landlords] = await Promise.all([
    listPaymentHistoryForViewer(session, { year, houseId, landlordId, status }),
    listHousesForViewer(session),
    listLandlords(),
  ]);

  const yearOptions = [currentYear - 1, currentYear, currentYear + 1];
  const hasFilters = houseId || landlordId || status;

  return (
    <DashboardShell estateName={estate?.name ?? ""} role="ADMIN">
      <h1 className="text-2xl font-semibold text-slate-900">Payment history</h1>
      <p className="mt-1 max-w-2xl text-slate-600">
        Every payment attempt — bank transfer or cash — with who reviewed it and when.
      </p>
      <PaymentsSubNav role="ADMIN" active="history" />

      <form method="get" className="mt-6 flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-4">
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
            {PAYMENT_STATUS_OPTIONS.map((opt) => (
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
          <a href="/admin/payments/history" className="text-sm text-slate-500 hover:underline">
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
              <th className="px-4 py-3 text-left font-medium text-slate-600">Method</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Amount</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Status</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Submitted</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Reviewed by</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {payments.map((payment) => {
              const display = PAYMENT_STATUS_DISPLAY[payment.status];
              return (
                <tr key={payment.id}>
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {payment.tenantDue.tenant.house.houseNumber}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{payment.tenantDue.tenant.fullName}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {payment.method === "BANK_TRANSFER" ? "Bank transfer" : "Cash"}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{formatNaira(payment.tenantDue.amount)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${display.className}`}
                    >
                      {display.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {payment.submittedAt.toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {payment.validatedBy?.name ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{payment.notes ?? "—"}</td>
                </tr>
              );
            })}
            {payments.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-slate-500">
                  No payment attempts match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </DashboardShell>
  );
}
