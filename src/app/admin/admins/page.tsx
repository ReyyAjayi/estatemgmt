import { requireRole } from "@/lib/auth-guard";
import { Role } from "@/generated/prisma/enums";
import { getEstate } from "@/lib/estate";
import { listAdminAccounts } from "@/lib/services/admins";
import { DashboardShell } from "@/components/DashboardShell";
import { AddAdminForm } from "./AddAdminForm";
import { ResetPasswordButton } from "./ResetPasswordButton";

export default async function AdminsPage() {
  const session = await requireRole([Role.ADMIN]);
  const estate = await getEstate();
  const admins = await listAdminAccounts();

  return (
    <DashboardShell estateName={estate?.name ?? ""} role="ADMIN">
      <h1 className="text-2xl font-semibold text-slate-900">Admins</h1>
      <p className="mt-1 max-w-2xl text-slate-600">
        Admin is the only role that can never be re-created after estate setup, so a single Admin
        losing their password would otherwise mean permanent lockout. Add at least one more Admin
        as a backup, and use this page to reset any Admin&apos;s password if they&apos;re ever
        locked out.
      </p>

      <div className="mt-6 overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-sm whitespace-nowrap">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Name</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Email</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Account</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {admins.map((admin) => (
              <tr key={admin.id}>
                <td className="px-4 py-3 font-medium text-slate-900">
                  {admin.name}
                  {admin.id === session.userId && (
                    <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
                      You
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-600">{admin.email}</td>
                <td className="px-4 py-3">
                  <ResetPasswordButton userId={admin.id} />
                </td>
              </tr>
            ))}
            {admins.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-slate-500">
                  No admins found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-8 rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-slate-900">Add an admin</h2>
        <div className="mt-3">
          <AddAdminForm />
        </div>
      </div>
    </DashboardShell>
  );
}
