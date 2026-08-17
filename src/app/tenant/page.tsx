import { requireRole } from "@/lib/auth-guard";
import { getEstate } from "@/lib/estate";
import { prisma } from "@/lib/prisma";
import { Role } from "@/generated/prisma/enums";
import { ensureDuesForYear, getDueForTenantYear } from "@/lib/services/dues";
import { listPaymentHistoryForViewer } from "@/lib/services/payments";
import { formatNaira } from "@/lib/currency";
import { PAYMENT_STATUS_DISPLAY } from "@/lib/payment-status";
import { DashboardShell } from "@/components/DashboardShell";
import { SubmitPaymentForm } from "./SubmitPaymentForm";

const STATUS_DISPLAY: Record<string, { label: string; className: string }> = {
  NOT_PAID: { label: "OUTSTANDING", className: "bg-red-100 text-red-800" },
  PAYMENT_SUBMITTED: {
    label: "SUBMITTED — AWAITING REVIEW",
    className: "bg-amber-100 text-amber-800",
  },
  VALIDATED: { label: "PAID", className: "bg-emerald-100 text-emerald-800" },
  REJECTED: { label: "REJECTED — PLEASE RESUBMIT", className: "bg-red-100 text-red-800" },
};

export default async function TenantDashboard() {
  const session = await requireRole([Role.TENANT]);
  const estate = await getEstate();
  const tenant = await prisma.tenant.findUniqueOrThrow({
    where: { id: session.tenantId },
    include: { house: true, livingSpaceType: true },
  });

  const year = new Date().getFullYear();
  if (estate) {
    await ensureDuesForYear(estate.id, year);
  }
  const due = await getDueForTenantYear(tenant.id, year);
  const status = due ? STATUS_DISPLAY[due.status] : null;
  const canSubmit = due && (due.status === "NOT_PAID" || due.status === "REJECTED");
  const history = await listPaymentHistoryForViewer(session);

  return (
    <DashboardShell estateName={estate?.name ?? ""} role="TENANT" personName={tenant.fullName}>
      <h1 className="text-2xl font-semibold text-slate-900">
        House {tenant.house.houseNumber} · {tenant.livingSpaceType.name}
      </h1>

      {due && status ? (
        <div className="mt-6 max-w-md rounded-lg border border-slate-200 bg-white p-6">
          <span
            className={`inline-block rounded-full px-3 py-1 text-sm font-semibold ${status.className}`}
          >
            {status.label}
          </span>
          <p className="mt-4 text-3xl font-semibold text-slate-900">{formatNaira(due.amount)}</p>
          <p className="text-sm text-slate-600">{year} estate due</p>
        </div>
      ) : (
        <p className="mt-6 max-w-md text-slate-600">
          Your {year} due hasn&apos;t been set up yet — check back soon, or contact your
          landlord.
        </p>
      )}

      {canSubmit && (
        <div className="mt-8 max-w-md rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-slate-900">Submit payment</h2>
          <p className="mt-1 text-sm text-slate-600">
            Pay by bank transfer, then upload your proof of payment below.
          </p>
          <div className="mt-3">
            <SubmitPaymentForm />
          </div>
        </div>
      )}

      {history.length > 0 && (
        <div className="mt-8 max-w-md">
          <h2 className="text-sm font-semibold text-slate-900">Payment history</h2>
          <ul className="mt-2 space-y-2">
            {history.map((payment) => {
              const display = PAYMENT_STATUS_DISPLAY[payment.status];
              return (
                <li key={payment.id} className="rounded-lg border border-slate-200 bg-white p-4">
                  <div className="flex items-center justify-between">
                    <span
                      className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${display.className}`}
                    >
                      {display.label}
                    </span>
                    <span className="text-xs text-slate-500">
                      {payment.submittedAt.toLocaleDateString()}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">
                    {payment.tenantDue.year} · {payment.method === "BANK_TRANSFER" ? "Bank transfer" : "Cash"} ·{" "}
                    {formatNaira(payment.tenantDue.amount)}
                  </p>
                  {payment.status === "REJECTED" && payment.notes && (
                    <p className="mt-1 text-sm text-red-700">Reason: {payment.notes}</p>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </DashboardShell>
  );
}
