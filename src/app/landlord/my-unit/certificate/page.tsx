import Link from "next/link";
import { requireRole } from "@/lib/auth-guard";
import { Role } from "@/generated/prisma/enums";
import { getEstate } from "@/lib/estate";
import { prisma } from "@/lib/prisma";
import { getOwnUnitForLandlord } from "@/lib/services/tenants";
import { getDueForTenantYear } from "@/lib/services/dues";
import { getCertificateForTenantDue } from "@/lib/services/certificates";
import { getAppOrigin } from "@/lib/app-url";
import { qrDataUrl } from "@/lib/qr";
import { formatNaira } from "@/lib/currency";
import { DashboardShell } from "@/components/DashboardShell";

export default async function LandlordMyUnitCertificatePage() {
  const session = await requireRole([Role.LANDLORD]);
  const estate = await getEstate();
  const landlord = await prisma.landlord.findUniqueOrThrow({ where: { userId: session.userId } });

  const tenant = await getOwnUnitForLandlord(session);
  const year = new Date().getFullYear();
  const due = tenant ? await getDueForTenantYear(tenant.id, year) : null;
  const certificate = due ? await getCertificateForTenantDue(due.id) : null;

  let qr: string | null = null;
  if (certificate) {
    const origin = await getAppOrigin();
    qr = await qrDataUrl(`${origin}/verify/${certificate.qrToken}`);
  }

  return (
    <DashboardShell estateName={estate?.name ?? ""} role="LANDLORD" personName={landlord.fullName}>
      <h1 className="text-2xl font-semibold text-slate-900">My unit certificate — {year}</h1>
      <p className="mt-1 max-w-md text-slate-600">
        <Link href="/landlord/my-unit" className="underline">
          Back to my unit
        </Link>
      </p>

      {certificate ? (
        <div className="mt-6 max-w-md rounded-lg border border-slate-200 bg-white p-6">
          <span className="inline-block rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-800">
            CLEAR
          </span>
          <dl className="mt-4 space-y-3 text-sm">
            <div>
              <dt className="text-xs font-medium uppercase text-slate-500">Certificate number</dt>
              <dd className="text-slate-900">{certificate.certificateNumber}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase text-slate-500">Amount cleared</dt>
              <dd className="text-slate-900">{formatNaira(certificate.tenantDue.amount)}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase text-slate-500">Issued</dt>
              <dd className="text-slate-900">{certificate.issuedAt.toLocaleDateString()}</dd>
            </div>
          </dl>

          {qr && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qr} alt="Certificate QR code" className="mt-4 h-40 w-40" />
          )}

          <a
            href={`/api/certificates/${due!.id}/pdf`}
            target="_blank"
            rel="noreferrer"
            className="mt-4 block w-full rounded-md bg-slate-900 px-4 py-3 text-center text-base font-semibold text-white shadow-sm hover:bg-slate-800"
          >
            Download PDF
          </a>
        </div>
      ) : (
        <p className="mt-6 max-w-md text-slate-600">
          No certificate yet — this appears once your {year} due is paid and validated.
        </p>
      )}
    </DashboardShell>
  );
}
