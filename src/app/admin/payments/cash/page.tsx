import { requireRole } from "@/lib/auth-guard";
import { Role } from "@/generated/prisma/enums";
import { getEstate } from "@/lib/estate";
import { ensureDuesForYear, listCashEligibleDues } from "@/lib/services/dues";
import { DashboardShell } from "@/components/DashboardShell";
import { PaymentsSubNav } from "@/components/PaymentsSubNav";
import { RecordCashForm } from "./RecordCashForm";

export default async function RecordCashPaymentPage() {
  await requireRole([Role.ADMIN]);
  const estate = await getEstate();
  const year = new Date().getFullYear();

  if (estate) {
    await ensureDuesForYear(estate.id, year);
  }
  const dues = estate ? await listCashEligibleDues(estate.id, year) : [];

  return (
    <DashboardShell estateName={estate?.name ?? ""} role="ADMIN">
      <h1 className="text-2xl font-semibold text-slate-900">Record cash payment</h1>
      <p className="mt-1 max-w-2xl text-slate-600">
        For tenants paying in cash rather than by bank transfer. Pick the tenant, confirm the
        amount, and this marks their {year} due as paid immediately.
      </p>
      <PaymentsSubNav role="ADMIN" active="cash" />

      <div className="mt-6 rounded-lg border border-slate-200 bg-white p-4">
        <RecordCashForm
          dues={dues.map((d) => ({
            id: d.id,
            houseNumber: d.tenant.house.houseNumber,
            tenantName: d.tenant.fullName,
            amount: d.amount,
          }))}
        />
      </div>
    </DashboardShell>
  );
}
