import { requireRole } from "@/lib/auth-guard";
import { Role } from "@/generated/prisma/enums";
import { getEstate } from "@/lib/estate";
import { listLivingSpaceTypesWithCurrentFee } from "@/lib/services/living-space-types";
import { DashboardShell } from "@/components/DashboardShell";
import { AddSpaceTypeForm } from "./AddSpaceTypeForm";
import { FeeEditForm } from "./FeeEditForm";

export default async function SpaceTypesPage() {
  await requireRole([Role.ADMIN]);
  const estate = await getEstate();
  const year = new Date().getFullYear();
  const spaceTypes = estate
    ? await listLivingSpaceTypesWithCurrentFee(estate.id, year)
    : [];

  return (
    <DashboardShell estateName={estate?.name ?? ""} role="ADMIN">
      <h1 className="text-2xl font-semibold text-slate-900">Living space types & fees</h1>
      <p className="mt-1 max-w-2xl text-slate-600">
        Every tenant is billed according to the fee for their living space type and the
        current year. Fees for past years are kept for history and don&apos;t change here.
      </p>

      <div className="mt-6 overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-sm whitespace-nowrap">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Type</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">{year} fee</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {spaceTypes.map((type) => (
              <tr key={type.id}>
                <td className="px-4 py-3 font-medium text-slate-900">{type.name}</td>
                <td className="px-4 py-3">
                  <FeeEditForm
                    livingSpaceTypeId={type.id}
                    year={year}
                    currentAmountNaira={
                      type.fees[0] ? type.fees[0].amount / 100 : null
                    }
                  />
                </td>
              </tr>
            ))}
            {spaceTypes.length === 0 && (
              <tr>
                <td colSpan={2} className="px-4 py-6 text-center text-slate-500">
                  No living space types yet. Add one below.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-8 rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-slate-900">Add a living space type</h2>
        <div className="mt-3">
          <AddSpaceTypeForm year={year} />
        </div>
      </div>
    </DashboardShell>
  );
}
