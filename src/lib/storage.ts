import "server-only";
import { writeFile, readFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

// Local-disk stand-in for the S3-compatible object storage recommended in
// Phase 0 (docs/phase-0-discovery.md §4 — Supabase Storage / Cloudflare R2).
// This works for local development and this environment's testing, but a
// serverless deployment (e.g. Vercel) has an ephemeral, mostly read-only
// filesystem — swap this module for a real object-storage client before
// deploying. Everything that calls this module only depends on
// saveProofFile()/readProofFile(url)/CONTENT_TYPES, so the swap is isolated
// here. See PRODUCT_DECISIONS.md, Phase 3.

const UPLOAD_ROOT = path.join(process.cwd(), ".data", "uploads", "proofs");

const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "application/pdf": "pdf",
};

export const MAX_PROOF_FILE_BYTES = 5 * 1024 * 1024; // 5MB

export function isAllowedProofFileType(mimeType: string): boolean {
  return mimeType in ALLOWED_TYPES;
}

export async function saveProofFile(file: File): Promise<string> {
  if (!isAllowedProofFileType(file.type)) {
    throw new Error("Proof of payment must be a JPG, PNG or PDF file.");
  }
  if (file.size > MAX_PROOF_FILE_BYTES) {
    throw new Error("Proof of payment must be smaller than 5MB.");
  }

  await mkdir(UPLOAD_ROOT, { recursive: true });
  const ext = ALLOWED_TYPES[file.type];
  const key = `${randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(UPLOAD_ROOT, key), buffer);
  return key;
}

export function readProofFile(key: string): Promise<Buffer> {
  return readFile(path.join(UPLOAD_ROOT, key));
}

export function proofFileContentType(key: string): string {
  const ext = path.extname(key).slice(1);
  const entry = Object.entries(ALLOWED_TYPES).find(([, e]) => e === ext);
  return entry?.[0] ?? "application/octet-stream";
}
