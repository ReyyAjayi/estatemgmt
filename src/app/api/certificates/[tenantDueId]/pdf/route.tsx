import { renderToBuffer } from "@react-pdf/renderer";
import { getSession } from "@/lib/session";
import { assertCanDownloadCertificate, getCertificateForTenantDue } from "@/lib/services/certificates";
import { getEstate } from "@/lib/estate";
import { formatNaira } from "@/lib/currency";
import { getAppOrigin } from "@/lib/app-url";
import { qrDataUrl } from "@/lib/qr";
import { CertificateDocument } from "@/lib/pdf/CertificateDocument";

// Gated the same way as /api/proofs/[key]: Admin any, Landlord their own
// tenants, Tenant their own certificate, Security never (verify-only — see
// docs/phase-0-discovery.md §6, "Generate/view certificate").
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ tenantDueId: string }> }
) {
  const session = await getSession();
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { tenantDueId } = await params;

  try {
    await assertCanDownloadCertificate(session, tenantDueId);
  } catch (err) {
    return new Response(err instanceof Error ? err.message : "Forbidden", { status: 403 });
  }

  const certificate = await getCertificateForTenantDue(tenantDueId);
  if (!certificate) {
    return new Response("No certificate has been issued for this due yet.", { status: 404 });
  }

  const estate = await getEstate();
  const origin = await getAppOrigin();
  const qr = await qrDataUrl(`${origin}/verify/${certificate.qrToken}`);

  const buffer = await renderToBuffer(
    <CertificateDocument
      estateName={estate?.name ?? "Estate"}
      tenantName={certificate.tenantDue.tenant.fullName}
      houseNumber={certificate.tenantDue.tenant.house.houseNumber}
      livingSpaceTypeName={certificate.tenantDue.tenant.livingSpaceType.name}
      year={certificate.tenantDue.year}
      amountLabel={formatNaira(certificate.tenantDue.amount)}
      certificateNumber={certificate.certificateNumber}
      issuedAtLabel={certificate.issuedAt.toLocaleDateString()}
      qrDataUrl={qr}
    />
  );

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${certificate.certificateNumber}.pdf"`,
    },
  });
}
