import Link from "next/link";
import { requireRole } from "@/lib/auth-guard";
import { Role } from "@/generated/prisma/enums";
import { getEstate } from "@/lib/estate";
import { listPendingPayments } from "@/lib/services/payments";
import { formatNaira } from "@/lib/currency";
import { DashboardShell } from "@/components/DashboardShell";
import { PaymentsSubNav } from "@/components/PaymentsSubNav";
import { PaymentRowActions } from "./PaymentRowActions";

export default async function PaymentReviewPage() {
  await requireRole([Role.ADMIN]);
  const estate = await getEstate();
  const pending = await listPendingPayments();

  return (
    <DashboardShell estateName={estate?.name ?? ""} role="ADMIN">
      <h1 className="text-2xl font-semibold text-slate-900">Review queue</h1>
      <p className="mt-1 max-w-2xl text-slate-600">
        Payments waiting for a decision, oldest first. Validate confirms the due is paid; reject
        sends it back to the tenant with a reason.
      </p>
      <PaymentsSubNav role="ADMIN" active="review" pendingCount={pending.length} />

      <div className="mt-6 overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-sm whitespace-nowrap">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-slate-600">House</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Tenant</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Landlord</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Amount</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Reference</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Proof</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Submitted</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Decision</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {pending.map((payment) => (
              <tr key={payment.id}>
                <td className="px-4 py-3 font-medium text-slate-900">
                  {payment.tenantDue.tenant.house.houseNumber}
                </td>
                <td className="px-4 py-3 text-slate-600">{payment.tenantDue.tenant.fullName}</td>
                <td className="px-4 py-3 text-slate-600">
                  {payment.tenantDue.tenant.house.landlord.fullName}
                </td>
                <td className="px-4 py-3 text-slate-600">{formatNaira(payment.tenantDue.amount)}</td>
                <td className="px-4 py-3 text-slate-600">{payment.referenceNumber ?? "—"}</td>
                <td className="px-4 py-3">
                  {payment.proofFileUrl ? (
                    <Link
                      href={`/admin/payments/proof/${payment.proofFileUrl}`}
                      className="text-slate-700 underline"
                    >
                      View
                    </Link>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {payment.submittedAt.toLocaleDateString()}
                </td>
                <td className="px-4 py-3">
                  <PaymentRowActions paymentId={payment.id} />
                </td>
              </tr>
            ))}
            {pending.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-slate-500">
                  Nothing waiting for review.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </DashboardShell>
  );
}
