import { requireRole } from "@/lib/auth-guard";
import { Role } from "@/generated/prisma/enums";
import { getEstate } from "@/lib/estate";
import { listHousesForViewer } from "@/lib/services/houses";
import { DashboardShell } from "@/components/DashboardShell";
import { AddHouseForm } from "./AddHouseForm";

export default async function LandlordHousesPage() {
  const session = await requireRole([Role.LANDLORD]);
  const estate = await getEstate();
  const houses = await listHousesForViewer(session);

  return (
    <DashboardShell estateName={estate?.name ?? ""} role="LANDLORD">
      <h1 className="text-2xl font-semibold text-slate-900">My houses</h1>
      <p className="mt-1 max-w-2xl text-slate-600">
        Share each House Code with the tenants living there, along with their own Tenant Code.
      </p>

      <div className="mt-6 overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-slate-600">House</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">House Code</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Active tenants</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {houses.map((house) => (
              <tr key={house.id}>
                <td className="px-4 py-3 font-medium text-slate-900">{house.houseNumber}</td>
                <td className="px-4 py-3 font-mono text-slate-600">{house.houseCode}</td>
                <td className="px-4 py-3 text-slate-600">
                  {house.tenants.filter((t) => t.status === "active").length}
                </td>
              </tr>
            ))}
            {houses.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-slate-500">
                  No houses yet. Add one below.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-8 rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-slate-900">Add a house</h2>
        <div className="mt-3">
          <AddHouseForm />
        </div>
      </div>
    </DashboardShell>
  );
}
