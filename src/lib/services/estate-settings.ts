import "server-only";
import { prisma } from "@/lib/prisma";
import { Role } from "@/generated/prisma/enums";
import type { SessionPayload } from "@/lib/session";
import { saveSignatureFile } from "@/lib/storage";

// Admin-only, single-estate MVP: there's exactly one Estate row to update.
// The chairman name/signature are Phase 0's "one Estate-level asset, reused
// automatically" decision (docs/phase-0-discovery.md §2.8) — no per-
// certificate signature, just this one record.
export async function updateEstateSettings(
  session: SessionPayload,
  input: { chairmanName: string | null; signatureFile: File | null }
) {
  if (session.role !== Role.ADMIN) {
    throw new Error("Only Admin can update estate settings.");
  }
  const estate = await prisma.estate.findFirstOrThrow();

  const data: { chairmanName: string | null; chairmanSignatureUrl?: string } = {
    chairmanName: input.chairmanName,
  };
  if (input.signatureFile) {
    data.chairmanSignatureUrl = await saveSignatureFile(input.signatureFile);
  }

  return prisma.estate.update({ where: { id: estate.id }, data });
}
