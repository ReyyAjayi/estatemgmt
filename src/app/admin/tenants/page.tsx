import { requireRole } from "@/lib/auth-guard";
import { Role } from "@/generated/prisma/enums";
import { getEstate } from "@/lib/estate";
import { listTenantsForViewer } from "@/lib/services/tenants";
import { listHousesForViewer } from "@/lib/services/houses";
import { listLivingSpaceTypes } from "@/lib/services/living-space-types";
import { DashboardShell } from "@/components/DashboardShell";
import { AddTenantForm } from "./AddTenantForm";
import { TenantRowActions } from "./TenantRowActions";

function param(sp: { [key: string]: string | string[] | undefined }, key: string) {
  const value = sp[key];
  return typeof value === "string" && value ? value : undefined;
}

export default async function AdminTenantsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await requireRole([Role.ADMIN]);
  const estate = await getEstate();
  const sp = await searchParams;
  const status = param(sp, "status") === "inactive" ? "inactive" : "active";

  const [tenants, houses, spaceTypes] = await Promise.all([
    listTenantsForViewer(session, { status }),
    listHousesForViewer(session),
    estate ? listLivingSpaceTypes(estate.id) : Promise.resolve([]),
  ]);

  return (
    <DashboardShell estateName={estate?.name ?? ""} role="ADMIN">
      <h1 className="text-2xl font-semibold text-slate-900">Tenants</h1>
      <p className="mt-1 max-w-2xl text-slate-600">
        {status === "active" ? "Active" : "Inactive"} tenants across the estate.
      </p>

      <form method="get" className="mt-6 flex items-end gap-3">
        <div>
          <label htmlFor="status" className="block text-sm font-medium text-slate-700">
            Status
          </label>
          <select
            id="status"
            name="status"
            defaultValue={status}
            className="mt-1 block rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        <button
          type="submit"
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800"
        >
          Filter
        </button>
      </form>

      <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200 bg-white">
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
                <td className="px-4 py-3 text-slate-600">
                  {tenant.house.houseNumber} ({tenant.house.landlord.fullName})
                </td>
                <td className="px-4 py-3 text-slate-600">{tenant.livingSpaceType.name}</td>
                <td className="px-4 py-3 font-mono text-slate-600">{tenant.tenantCode}</td>
                <td className="px-4 py-3">
                  <TenantRowActions
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
                  {status === "active"
                    ? "No active tenants. Add one below."
                    : "No inactive tenants."}
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
            houses={houses.map((h) => ({
              id: h.id,
              houseNumber: h.houseNumber,
              landlordName: h.landlord.fullName,
            }))}
            spaceTypes={spaceTypes.map((t) => ({ id: t.id, name: t.name }))}
          />
        </div>
      </div>
    </DashboardShell>
  );
}
