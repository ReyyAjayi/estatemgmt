import "server-only";
import { writeFile, readFile as fsReadFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";

// Object storage for proof-of-payment uploads and the chairman's signature.
// Backed by an S3-compatible bucket when S3_BUCKET is configured (Cloudflare
// R2, Supabase Storage, and AWS S3 all speak the same API — only
// S3_ENDPOINT/region/credentials differ between them; see
// docs/deployment.md). Falls back to local disk under .data/uploads/ when
// unset, which is fine for local development but NOT for a serverless
// deploy (ephemeral, mostly read-only filesystem) — this is why the fallback
// exists only as a dev convenience, not a production path. See
// PRODUCT_DECISIONS.md, Phase 3 (#25) and the Phase 8 follow-up.

const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "application/pdf": "pdf",
};

export const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5MB
export const MAX_PROOF_FILE_BYTES = MAX_FILE_BYTES;

export function isAllowedFileType(mimeType: string): boolean {
  return mimeType in ALLOWED_TYPES;
}
export const isAllowedProofFileType = isAllowedFileType;

const UPLOAD_ROOT = path.join(process.cwd(), ".data", "uploads");

const s3Bucket = process.env.S3_BUCKET;
const s3 = s3Bucket
  ? new S3Client({
      region: process.env.S3_REGION || "auto",
      endpoint: process.env.S3_ENDPOINT, // omit for real AWS S3, required for R2/Supabase
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID!,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
      },
      forcePathStyle: true,
    })
  : null;

type Folder = "proofs" | "signatures";

async function saveFile(file: File, folder: Folder): Promise<string> {
  if (!isAllowedFileType(file.type)) {
    throw new Error("File must be a JPG, PNG or PDF.");
  }
  if (file.size > MAX_FILE_BYTES) {
    throw new Error("File must be smaller than 5MB.");
  }

  const ext = ALLOWED_TYPES[file.type];
  const key = `${folder}/${randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  if (s3 && s3Bucket) {
    await s3.send(
      new PutObjectCommand({ Bucket: s3Bucket, Key: key, Body: buffer, ContentType: file.type })
    );
  } else {
    await mkdir(path.join(UPLOAD_ROOT, folder), { recursive: true });
    await writeFile(path.join(UPLOAD_ROOT, key), buffer);
  }
  return key;
}

async function readStoredFile(key: string): Promise<Buffer> {
  if (s3 && s3Bucket) {
    const result = await s3.send(new GetObjectCommand({ Bucket: s3Bucket, Key: key }));
    const bytes = await result.Body!.transformToByteArray();
    return Buffer.from(bytes);
  }
  return fsReadFile(path.join(UPLOAD_ROOT, key));
}

function contentTypeFor(key: string): string {
  const ext = path.extname(key).slice(1);
  const entry = Object.entries(ALLOWED_TYPES).find(([, e]) => e === ext);
  return entry?.[0] ?? "application/octet-stream";
}

export function saveProofFile(file: File): Promise<string> {
  return saveFile(file, "proofs");
}
export function readProofFile(key: string): Promise<Buffer> {
  return readStoredFile(key);
}
export function proofFileContentType(key: string): string {
  return contentTypeFor(key);
}

export function saveSignatureFile(file: File): Promise<string> {
  return saveFile(file, "signatures");
}
export function readSignatureFile(key: string): Promise<Buffer> {
  return readStoredFile(key);
}
export function signatureContentType(key: string): string {
  return contentTypeFor(key);
}
