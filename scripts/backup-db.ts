// Dumps the production database and uploads it to the same S3-compatible
// bucket used for proof-of-payment/signature storage, under a distinct
// "backups/" prefix. Run daily by .github/workflows/backup.yml -- see
// docs/deployment.md for the GitHub Secrets it needs. Not part of the app
// build; invoked directly with `tsx` (in CI or manually).
import "dotenv/config";
import { spawn } from "node:child_process";
import { createGzip } from "node:zlib";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

// DIRECT_URL (not the pooled DATABASE_URL) -- pg_dump needs a real session,
// same reasoning as prisma.config.ts. Falls back to DATABASE_URL for setups
// with no pooler (e.g. Neon), matching prisma.config.ts's fallback.
const rawConnectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
const bucket = process.env.S3_BUCKET;

// Prisma-only query params (schema=, pgbouncer=true, connection_limit=,
// etc.) aren't real libpq parameters -- pg_dump's URI parser rejects them
// outright with "invalid URI query parameter", so they must be stripped
// before pg_dump ever sees the connection string.
const PRISMA_ONLY_PARAMS = ["schema", "pgbouncer", "connection_limit", "pool_timeout", "statement_cache_size"];

function pgDumpConnectionString(url: string): string {
  const parsed = new URL(url);
  for (const param of PRISMA_ONLY_PARAMS) {
    parsed.searchParams.delete(param);
  }
  return parsed.toString();
}

async function main() {
  if (!rawConnectionString) {
    throw new Error("DIRECT_URL or DATABASE_URL must be set.");
  }
  if (!bucket) {
    throw new Error("S3_BUCKET must be set.");
  }
  const connectionString = pgDumpConnectionString(rawConnectionString);

  const s3 = new S3Client({
    region: process.env.S3_REGION || "auto",
    endpoint: process.env.S3_ENDPOINT,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID!,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
    },
    forcePathStyle: true,
  });

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const key = `backups/estatemgmt-${timestamp}.sql.gz`;

  const dump = spawn("pg_dump", [connectionString, "--no-owner", "--no-privileges"]);
  const gzip = createGzip();
  const chunks: Buffer[] = [];
  let stderr = "";

  dump.stdout.pipe(gzip);
  dump.stderr.on("data", (d: Buffer) => (stderr += d.toString()));
  gzip.on("data", (chunk: Buffer) => chunks.push(chunk));

  const [exitCode] = await Promise.all([
    new Promise<number>((resolve, reject) => {
      dump.on("error", reject);
      dump.on("close", (code) => resolve(code ?? 1));
    }),
    new Promise<void>((resolve, reject) => {
      gzip.on("end", () => resolve());
      gzip.on("error", reject);
    }),
  ]);

  if (exitCode !== 0) {
    throw new Error(`pg_dump exited with code ${exitCode}: ${stderr}`);
  }

  const body = Buffer.concat(chunks);
  if (body.length === 0) {
    throw new Error("Backup produced an empty file -- refusing to upload.");
  }

  await s3.send(
    new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: "application/gzip" })
  );

  console.log(`Backup uploaded: ${key} (${(body.length / 1024).toFixed(1)} KB)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
