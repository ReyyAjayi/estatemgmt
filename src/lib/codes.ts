import "server-only";
import { randomInt, randomBytes } from "node:crypto";

// Excludes visually ambiguous characters (0/O, 1/I/L) so codes are easy to
// read aloud or copy from a notice board without transcription errors.
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

function randomCode(length: number): string {
  let code = "";
  for (let i = 0; i < length; i++) {
    code += ALPHABET[randomInt(ALPHABET.length)];
  }
  return code;
}

// Long enough to resist brute-force guessing (see docs/phase-0-discovery.md §3):
// House Code + Tenant Code together are the tenant's full credential.
export function generateHouseCode(): string {
  return randomCode(8);
}

export function generateTenantCode(): string {
  return randomCode(8);
}

// Initial passwords for Landlord/Security accounts that Admin creates
// in-app (see docs/phase-0-discovery.md §10.7) — shown once so Admin can
// share it out of band, same pattern as House/Tenant codes.
export function generateTempPassword(): string {
  return randomCode(10);
}

// Human-facing certificate number, printed on the PDF — legible, not secret.
export function generateCertificateNumber(year: number): string {
  return `CERT-${year}-${randomCode(6)}`;
}

// Opaque QR token — the actual verification credential, so it needs real
// entropy (unlike the certificate number above, which is just a label).
// URL-safe since it's embedded directly in the /verify/[token] path.
export function generateQrToken(): string {
  return randomBytes(20).toString("base64url");
}
