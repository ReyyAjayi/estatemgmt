import "server-only";
import { randomInt } from "node:crypto";

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
