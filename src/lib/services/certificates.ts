import "server-only";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { Role } from "@/generated/prisma/enums";
import type { SessionPayload } from "@/lib/session";
import { generateCertificateNumber, generateQrToken } from "@/lib/codes";
import { ownLandlordId } from "./viewer-scope";

async function uniqueCertificateNumber(tx: Prisma.TransactionClient, year: number): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const number = generateCertificateNumber(year);
    const existing = await tx.certificate.findUnique({ where: { certificateNumber: number } });
    if (!existing) return number;
  }
  throw new Error("Could not generate a unique certificate number. Please try again.");
}

async function uniqueQrToken(tx: Prisma.TransactionClient): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const token = generateQrToken();
    const existing = await tx.certificate.findUnique({ where: { qrToken: token } });
    if (!existing) return token;
  }
  throw new Error("Could not generate a unique QR token. Please try again.");
}

// Called from inside the same transaction that flips a TenantDue to
// VALIDATED (see payments.ts) — a due can only ever reach VALIDATED once
// under the current rules (no resubmission once validated), but this stays
// idempotent defensively rather than relying on that invariant never
// changing. See docs/phase-0-discovery.md §5, "TenantDue 1—1 Certificate."
export async function issueCertificate(
  tx: Prisma.TransactionClient,
  input: { tenantDueId: string; year: number; issuedById: string }
) {
  const existing = await tx.certificate.findUnique({ where: { tenantDueId: input.tenantDueId } });
  if (existing) return existing;

  const certificateNumber = await uniqueCertificateNumber(tx, input.year);
  const qrToken = await uniqueQrToken(tx);
  return tx.certificate.create({
    data: {
      tenantDueId: input.tenantDueId,
      certificateNumber,
      qrToken,
      issuedById: input.issuedById,
    },
  });
}

export function getCertificateForTenantDue(tenantDueId: string) {
  return prisma.certificate.findUnique({
    where: { tenantDueId },
    include: {
      tenantDue: { include: { tenant: { include: { house: true, livingSpaceType: true } } } },
    },
  });
}

// Gated verification lookup (docs/phase-0-discovery.md §10.3): only an
// authenticated Admin/Landlord/Security session may resolve a QR token, and
// a Landlord only ever resolves their own tenants' certificates — anything
// else returns null, the same "not found" a stranger's guess would get, so
// scanning doesn't leak which tokens are real.
export async function resolveCertificateForVerification(session: SessionPayload, qrToken: string) {
  const certificate = await prisma.certificate.findUnique({
    where: { qrToken },
    include: {
      tenantDue: { include: { tenant: { include: { house: { include: { landlord: true } } } } } },
    },
  });
  if (!certificate) return null;

  if (session.role === Role.LANDLORD) {
    const landlordId = await ownLandlordId(session);
    if (certificate.tenantDue.tenant.house.landlordId !== landlordId) return null;
  }

  return certificate;
}

// Download authorization: Admin can fetch any certificate PDF, Landlord only
// their own tenants', Tenant only their own — Security can verify (above)
// but never downloads a copy, per the Phase 0 permissions table.
export async function assertCanDownloadCertificate(session: SessionPayload, tenantDueId: string) {
  if (session.role === Role.SECURITY) {
    throw new Error("Security accounts cannot download certificates.");
  }

  const due = await prisma.tenantDue.findUnique({
    where: { id: tenantDueId },
    include: { tenant: { include: { house: true } } },
  });
  if (!due) throw new Error("Due not found.");

  if (session.role === Role.TENANT && due.tenantId !== session.tenantId) {
    throw new Error("You can only download your own certificate.");
  }
  if (session.role === Role.LANDLORD) {
    const landlordId = await ownLandlordId(session);
    if (due.tenant.house.landlordId !== landlordId) {
      throw new Error("You can only download certificates for your own tenants.");
    }
  }

  return due;
}
