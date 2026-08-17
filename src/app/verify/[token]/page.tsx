import { requireRole } from "@/lib/auth-guard";
import { Role } from "@/generated/prisma/enums";
import { getEstate } from "@/lib/estate";
import { resolveCertificateForVerification } from "@/lib/services/certificates";
import { DashboardShell } from "@/components/DashboardShell";

// The gated QR-verification lookup from docs/phase-0-discovery.md §10.3:
// requires an authenticated Admin/Landlord/Security session, and shows only
// CLEAR + who/where — never amounts, references, or proof files. A
// Landlord's own-tenant scoping and any invalid/foreign token both land here
// as the same "no matching certificate" message, so a scan can't be used to
// probe which tokens exist.
export default async function VerifyCertificatePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const session = await requireRole([Role.ADMIN, Role.LANDLORD, Role.SECURITY]);
  const estate = await getEstate();
  const { token } = await params;

  const certificate = await resolveCertificateForVerification(session, token);

  return (
    <DashboardShell estateName={estate?.name ?? ""} role={session.role}>
      <h1 className="text-2xl font-semibold text-slate-900">Certificate verification</h1>

      {certificate ? (
        <div className="mt-6 max-w-md rounded-lg border border-slate-200 bg-white p-6">
          <span className="inline-block rounded-full bg-emerald-100 px-4 py-1.5 text-base font-semibold text-emerald-800">
            CLEAR
          </span>
          <dl className="mt-4 space-y-3 text-sm">
            <div>
              <dt className="text-xs font-medium uppercase text-slate-500">Tenant</dt>
              <dd className="text-slate-900">{certificate.tenantDue.tenant.fullName}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase text-slate-500">House</dt>
              <dd className="text-slate-900">{certificate.tenantDue.tenant.house.houseNumber}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase text-slate-500">Year</dt>
              <dd className="text-slate-900">{certificate.tenantDue.year}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase text-slate-500">Certificate number</dt>
              <dd className="text-slate-900">{certificate.certificateNumber}</dd>
            </div>
          </dl>
        </div>
      ) : (
        <div className="mt-6 max-w-md rounded-lg border border-red-200 bg-red-50 p-6">
          <span className="inline-block rounded-full bg-red-100 px-4 py-1.5 text-base font-semibold text-red-800">
            NOT FOUND
          </span>
          <p className="mt-3 text-sm text-red-900">
            No matching certificate. Double-check the QR code, or that this tenant is one of
            yours.
          </p>
        </div>
      )}
    </DashboardShell>
  );
}
