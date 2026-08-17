import { requireRole } from "@/lib/auth-guard";
import { Role } from "@/generated/prisma/enums";
import { getEstate } from "@/lib/estate";
import { listTenantsForViewer } from "@/lib/services/tenants";
import { listHousesForViewer } from "@/lib/services/houses";
import { listLivingSpaceTypes } from "@/lib/services/living-space-types";
import { DashboardShell } from "@/components/DashboardShell";
import { AddTenantForm } from "./AddTenantForm";
import { RequestDeactivationButton } from "./RequestDeactivationButton";

export default async function LandlordTenantsPage() {
  const session = await requireRole([Role.LANDLORD]);
  const estate = await getEstate();
  const [tenants, houses, spaceTypes] = await Promise.all([
    listTenantsForViewer(session),
    listHousesForViewer(session),
    estate ? listLivingSpaceTypes(estate.id) : Promise.resolve([]),
  ]);

  return (
    <DashboardShell estateName={estate?.name ?? ""} role="LANDLORD">
      <h1 className="text-2xl font-semibold text-slate-900">My tenants</h1>
      <p className="mt-1 max-w-2xl text-slate-600">Tenants across your houses.</p>

      <div className="mt-6 overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-sm whitespace-nowrap">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Tenant</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">House</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Space</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Tenant Code</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {tenants.map((tenant) => (
              <tr key={tenant.id}>
                <td className="px-4 py-3 font-medium text-slate-900">{tenant.fullName}</td>
                <td className="px-4 py-3 text-slate-600">{tenant.house.houseNumber}</td>
                <td className="px-4 py-3 text-slate-600">{tenant.livingSpaceType.name}</td>
                <td className="px-4 py-3 font-mono text-slate-600">{tenant.tenantCode}</td>
                <td className="px-4 py-3">
                  <RequestDeactivationButton
                    tenantId={tenant.id}
                    status={tenant.status}
                    deactivationRequested={tenant.deactivationRequestedAt !== null}
                  />
                </td>
              </tr>
            ))}
            {tenants.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                  No tenants yet. Add one below.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-8 rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-slate-900">Add a tenant</h2>
        <div className="mt-3">
          <AddTenantForm
            houses={houses.map((h) => ({ id: h.id, houseNumber: h.houseNumber }))}
            spaceTypes={spaceTypes.map((t) => ({ id: t.id, name: t.name }))}
          />
        </div>
      </div>
    </DashboardShell>
  );
}
