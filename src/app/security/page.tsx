import { requireRole } from "@/lib/auth-guard";
import { getEstate } from "@/lib/estate";
import { prisma } from "@/lib/prisma";
import { Role } from "@/generated/prisma/enums";
import { searchClearanceStatus } from "@/lib/services/lookup";
import { DashboardShell } from "@/components/DashboardShell";

function param(sp: { [key: string]: string | string[] | undefined }, key: string) {
  const value = sp[key];
  return typeof value === "string" && value ? value : undefined;
}

export default async function SecurityDashboard({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await requireRole([Role.SECURITY]);
  const estate = await getEstate();
  const security = await prisma.security.findUniqueOrThrow({
    where: { userId: session.userId },
  });
  const sp = await searchParams;
  const q = param(sp, "q");

  const year = new Date().getFullYear();
  const results = q && estate ? await searchClearanceStatus(estate.id, q, year) : undefined;

  return (
    <DashboardShell estateName={estate?.name ?? ""} role="SECURITY" personName={security.fullName}>
      <h1 className="text-2xl font-semibold text-slate-900">Clearance lookup</h1>
      <p className="mt-1 max-w-md text-slate-600">
        Search a house number or tenant code to check {year} clearance. Scanning a tenant&apos;s
        certificate QR with your phone&apos;s camera works too — it opens the same check directly.
      </p>

      <form method="get" className="mt-6 flex max-w-md gap-2">
        <input
          id="q"
          name="q"
          type="text"
          defaultValue={q ?? ""}
          placeholder="House number or Tenant Code"
          autoComplete="off"
          className="block w-full rounded-md border border-slate-300 px-3 py-2.5 text-base shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
        />
        <button
          type="submit"
          className="rounded-md bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800"
        >
          Search
        </button>
      </form>

      {q && (
        <div className="mt-6 max-w-md space-y-3">
          {results === undefined ? null : results === null ? (
            <p className="rounded-md bg-slate-100 px-4 py-3 text-sm text-slate-600">
              No house or tenant matches &ldquo;{q}&rdquo;.
            </p>
          ) : results.length === 0 ? (
            <p className="rounded-md bg-slate-100 px-4 py-3 text-sm text-slate-600">
              That house has no active tenants.
            </p>
          ) : (
            results.map((r) => (
              <div
                key={r.tenantId}
                className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4"
              >
                <div>
                  <p className="font-medium text-slate-900">{r.tenantName}</p>
                  <p className="text-sm text-slate-500">House {r.houseNumber}</p>
                </div>
                <span
                  className={`inline-block rounded-full px-3 py-1 text-sm font-semibold ${
                    r.clear ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"
                  }`}
                >
                  {r.clear ? "CLEAR" : "NOT CLEAR"}
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </DashboardShell>
  );
}
