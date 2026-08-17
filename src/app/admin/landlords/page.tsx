import { requireRole } from "@/lib/auth-guard";
import { Role } from "@/generated/prisma/enums";
import { getEstate } from "@/lib/estate";
import { listLandlords } from "@/lib/services/landlords";
import { DashboardShell } from "@/components/DashboardShell";
import { AddLandlordForm } from "./AddLandlordForm";
import { ResetPasswordButton } from "./ResetPasswordButton";

export default async function LandlordsPage() {
  await requireRole([Role.ADMIN]);
  const estate = await getEstate();
  const landlords = await listLandlords();

  return (
    <DashboardShell estateName={estate?.name ?? ""} role="ADMIN">
      <h1 className="text-2xl font-semibold text-slate-900">Landlords</h1>
      <p className="mt-1 max-w-2xl text-slate-600">
        Landlords manage their own houses and tenants. Adding one here creates their sign-in.
      </p>

      <div className="mt-6 overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-sm whitespace-nowrap">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Name</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Phone</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Email</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Houses</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Account</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {landlords.map((landlord) => (
              <tr key={landlord.id}>
                <td className="px-4 py-3 font-medium text-slate-900">{landlord.fullName}</td>
                <td className="px-4 py-3 text-slate-600">{landlord.phone}</td>
                <td className="px-4 py-3 text-slate-600">{landlord.user.email}</td>
                <td className="px-4 py-3 text-slate-600">{landlord.houses.length}</td>
                <td className="px-4 py-3">
                  <ResetPasswordButton landlordId={landlord.id} />
                </td>
              </tr>
            ))}
            {landlords.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                  No landlords yet. Add one below.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-8 rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-slate-900">Add a landlord</h2>
        <div className="mt-3">
          <AddLandlordForm />
        </div>
      </div>
    </DashboardShell>
  );
}
