# Deployment Guide

This app was built to deploy on **Vercel**, with a managed Postgres provider and S3-compatible object storage, per the Phase 0 architecture decision (`docs/phase-0-discovery.md` §4). This guide covers what's needed to go live.

## What's ready vs. what's waiting on you

Both items previously flagged as blockers now have code support — what's left is provisioning real accounts, not writing more code:

1. **Proof-of-payment & signature storage** (`PRODUCT_DECISIONS.md` #25). `src/lib/storage.ts` supports an S3-compatible object-storage backend (Cloudflare R2, Supabase Storage, and AWS S3 all work unchanged — same API, just different endpoint/credentials), selected automatically when the `S3_*` environment variables below are set. **Without them, it falls back to local disk**, which works for development but **will not work on Vercel** — its filesystem is ephemeral and mostly read-only outside `/tmp`. You need to pick a provider, create a bucket, and set the env vars before deploying. Cloudflare R2 is the recommendation (zero egress fees, generous free tier, S3-compatible); Supabase Storage is a reasonable alternative if you're already using Supabase for Postgres.
2. **Chairman name/signature on certificates** (`PRODUCT_DECISIONS.md` #39). Admin can now set both from **Settings** in the Admin nav (`/admin/settings`) — no code change needed, just log in as Admin and fill it in. Certificates render without a signature line until you do.
3. **Push notifications for Admin announcements**. Optional — without the VAPID env vars below, Admin can still post an announcement and everyone sees it as an in-app banner next time they open the app; it just isn't pushed to devices that enabled notifications. Generate a keypair once with `npx web-push generate-vapid-keys` and set the three env vars from it (step 4).

## Also worth knowing before higher-traffic production use

- **Login rate limiting is in-memory** (`src/lib/rate-limit.ts`), keyed per server process. It works correctly on a single long-running server, but doesn't share state across multiple serverless instances — on Vercel, different requests can land on different warm instances, so the limit is "per instance," not truly global. It's a reasonable stopgap on top of the existing per-account/per-house lockout for a single estate's traffic, but a platform-level rate limiter (Vercel Firewall, or Upstash Ratelimit backed by Redis) would be a better fit if traffic grows.

## Steps

1. **Push this repository to GitHub** (if not already) and import it into Vercel as a new project.
2. **Provision a Postgres database** — Neon or Supabase both work. **If you're on Supabase, you need two connection strings, not one** (Project Settings → Database → Connection string):
   - `DATABASE_URL` — the **Transaction pooler** URI (port `6543`, with `?pgbouncer=true`). This is what the app uses for every request at runtime. Serverless functions open many short-lived connections, and transaction-mode pooling is built for exactly that.
   - `DIRECT_URL` — the **direct connection** (port `5432`, host like `db.<project-ref>.supabase.co`, no pooler). Used only when running migrations (step 5).
   - **Do not put the Session pooler URI (also port `5432`, host `...pooler.supabase.com`) in `DATABASE_URL`.** It caps out at a very small `pool_size` (commonly 15) shared across all connections, and unlike transaction pooling it holds each connection for the life of the client rather than multiplexing. Under any real traffic — or even a `migrate deploy` racing app requests — you'll hit `FATAL: max clients reached in session mode`, which surfaces in the app as random "Something went wrong" errors and can even fail your build.
   - Neon doesn't have this distinction — Neon's standard pooled connection string works fine as `DATABASE_URL` alone, and `DIRECT_URL` can be left unset.
3. **Provision object storage** — create a bucket with your chosen provider:
   - **Cloudflare R2** (recommended): create a bucket in the Cloudflare dashboard, create an API token scoped to it, note the account-id-based endpoint (`https://<account-id>.r2.cloudflarestorage.com`).
   - **Supabase Storage**: create a bucket in your Supabase project; use its S3-compatible endpoint (Project Settings → Storage → S3 Connection) and an access key pair.
   - **AWS S3**: create a bucket and an IAM user/role with read/write access to it; omit `S3_ENDPOINT` (defaults to real AWS).
4. **Set environment variables** in the Vercel project settings:
   - `DATABASE_URL` (and `DIRECT_URL` if applicable) — from step 2.
   - `SESSION_SECRET` — a long random string (32+ characters) used to sign session cookies. Generate one with `openssl rand -base64 32`. Do not reuse the local `.env` value.
   - `S3_BUCKET`, `S3_REGION`, `S3_ENDPOINT` (omit for real AWS S3), `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` — from step 3. See `.env.example` for the exact names.
   - `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_CONTACT_EMAIL` — optional, for push notifications on announcements. Generate a keypair with `npx web-push generate-vapid-keys` and use its `publicKey`/`privateKey` output; `VAPID_CONTACT_EMAIL` is any address the push services can contact you at if they need to (not shown to residents). `NEXT_PUBLIC_VAPID_PUBLIC_KEY` is inlined into the client bundle at build time, so set it before deploying, not after.
5. **Run migrations against the production database** before the first deploy (or as part of your deploy pipeline):
   ```bash
   DATABASE_URL="<production-url>" DIRECT_URL="<direct-url-if-applicable>" npm run db:migrate:deploy
   ```
   This runs `prisma migrate deploy` — the non-interactive, production-safe counterpart to `prisma migrate dev` used locally. It applies existing migrations only; it never generates new ones or prompts for confirmation. `prisma.config.ts` points migrations at `DIRECT_URL` when it's set (falling back to `DATABASE_URL` otherwise), so on Supabase this step correctly uses the direct connection even though the app runs on the pooled one.
6. **Deploy.** Vercel will run `npm install` (which triggers `postinstall: prisma generate`) and `npm run build` automatically.
7. **Visit the deployed URL.** With no `Estate` row yet, you'll land on `/setup` — this creates the estate and the first Admin account, exactly like local development.
8. **Smoke test**: log in as that Admin, set the chairman name/signature under Settings, add a living-space type/fee, a landlord, a house, and a tenant; log in as the tenant and submit a payment; validate it as Admin; confirm the certificate PDF downloads with the signature on it and its QR code resolves at `/verify/[token]`.

## Backups

Neither Vercel nor a free-tier Postgres provider backs up your data automatically — Supabase's free tier specifically has **no automated backups and no point-in-time recovery**, and separately **auto-pauses the whole project after 7 days with no database activity** (the next request just fails until someone manually resumes it from the Supabase dashboard). Both are worth closing at zero added cost rather than waiting until you can afford Supabase Pro:

`.github/workflows/backup.yml` runs `scripts/backup-db.ts` daily (`workflow_dispatch` also lets you trigger it on demand) — it `pg_dump`s the database, gzips it, and uploads it to the same S3-compatible bucket used for proofs/signatures, under a `backups/` prefix. Because it's a real daily connection to the database, it also resets Supabase's 7-day inactivity clock, so it solves the auto-pause problem as a side effect.

To enable it, add these as **GitHub Actions repository secrets** (Settings → Secrets and variables → Actions — separate from Vercel's environment variables, GitHub Actions can't read those):

- `DIRECT_URL` (or `DATABASE_URL` if you don't have a separate one) — same value as in Vercel.
- `S3_BUCKET`, `S3_REGION`, `S3_ENDPOINT`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` — same values as in Vercel.

To restore from a backup: download the `.sql.gz` object from your bucket's `backups/` prefix, then `gunzip -c <file> | psql "<DIRECT_URL>"` against a fresh/target database.

To run a backup manually from your machine: `npm run db:backup` (reads the same env vars from `.env`).

## What doesn't need attention

Everything else — the auth/session system, the service-layer authorization model, the data model, Tailwind build — is framework-standard and needs no deployment-specific changes. `next.config.ts` has no custom build overrides that would conflict with Vercel's defaults.
