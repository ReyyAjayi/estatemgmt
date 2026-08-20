import { requireRole } from "@/lib/auth-guard";
import { Role } from "@/generated/prisma/enums";
import { getEstate } from "@/lib/estate";
import { listSecurityAccounts } from "@/lib/services/security";
import { DashboardShell } from "@/components/DashboardShell";
import { AddSecurityForm } from "./AddSecurityForm";
import { ToggleStatusButton } from "./ToggleStatusButton";

export default async function SecurityAccountsPage() {
  await requireRole([Role.ADMIN]);
  const estate = await getEstate();
  const securityAccounts = await listSecurityAccounts();

  return (
    <DashboardShell estateName={estate?.name ?? ""} role="ADMIN">
      <h1 className="text-2xl font-semibold text-slate-900">Security</h1>
      <p className="mt-1 max-w-2xl text-slate-600">
        Security accounts can look up clearance status at the gate. Adding one here creates their
        sign-in.
      </p>

      <div className="mt-6 overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-sm whitespace-nowrap">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Name</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Phone</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Email</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Status</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Account</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {securityAccounts.map((security) => (
              <tr key={security.id}>
                <td className="px-4 py-3 font-medium text-slate-900">{security.fullName}</td>
                <td className="px-4 py-3 text-slate-600">{security.phone}</td>
                <td className="px-4 py-3 text-slate-600">{security.user.email}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${
                      security.user.status === "active"
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {security.user.status === "active" ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <ToggleStatusButton securityId={security.id} status={security.user.status} />
                </td>
              </tr>
            ))}
            {securityAccounts.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                  No security accounts yet. Add one below.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-8 rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-slate-900">Add a security account</h2>
        <div className="mt-3">
          <AddSecurityForm />
        </div>
      </div>
    </DashboardShell>
  );
}
