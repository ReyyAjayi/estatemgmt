import { requireRole } from "@/lib/auth-guard";
import { Role } from "@/generated/prisma/enums";
import { getEstate } from "@/lib/estate";
import { listPaymentHistoryForViewer } from "@/lib/services/payments";
import { formatNaira } from "@/lib/currency";
import { PAYMENT_STATUS_DISPLAY } from "@/lib/payment-status";
import { DashboardShell } from "@/components/DashboardShell";
import { PaymentsSubNav } from "@/components/PaymentsSubNav";

export default async function LandlordPaymentHistoryPage() {
  const session = await requireRole([Role.LANDLORD]);
  const estate = await getEstate();
  const payments = await listPaymentHistoryForViewer(session);

  return (
    <DashboardShell estateName={estate?.name ?? ""} role="LANDLORD">
      <h1 className="text-2xl font-semibold text-slate-900">Payment history</h1>
      <p className="mt-1 max-w-2xl text-slate-600">
        Every payment attempt for your tenants — bank transfer or cash.
      </p>
      <PaymentsSubNav role="LANDLORD" active="history" />

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
                </tr>
              );
            })}
            {payments.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
                  No payment attempts yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </DashboardShell>
  );
}
