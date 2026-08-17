# Deployment Guide

This app was built to deploy on **Vercel**, with a managed Postgres provider and S3-compatible object storage, per the Phase 0 architecture decision (`docs/phase-0-discovery.md` §4). This guide covers what's needed to go live.

## What's ready vs. what's waiting on you

Both items previously flagged as blockers now have code support — what's left is provisioning real accounts, not writing more code:

1. **Proof-of-payment & signature storage** (`PRODUCT_DECISIONS.md` #25). `src/lib/storage.ts` supports an S3-compatible object-storage backend (Cloudflare R2, Supabase Storage, and AWS S3 all work unchanged — same API, just different endpoint/credentials), selected automatically when the `S3_*` environment variables below are set. **Without them, it falls back to local disk**, which works for development but **will not work on Vercel** — its filesystem is ephemeral and mostly read-only outside `/tmp`. You need to pick a provider, create a bucket, and set the env vars before deploying. Cloudflare R2 is the recommendation (zero egress fees, generous free tier, S3-compatible); Supabase Storage is a reasonable alternative if you're already using Supabase for Postgres.
2. **Chairman name/signature on certificates** (`PRODUCT_DECISIONS.md` #39). Admin can now set both from **Settings** in the Admin nav (`/admin/settings`) — no code change needed, just log in as Admin and fill it in. Certificates render without a signature line until you do.

## Also worth knowing before higher-traffic production use

- **Login rate limiting is in-memory** (`src/lib/rate-limit.ts`), keyed per server process. It works correctly on a single long-running server, but doesn't share state across multiple serverless instances — on Vercel, different requests can land on different warm instances, so the limit is "per instance," not truly global. It's a reasonable stopgap on top of the existing per-account/per-house lockout for a single estate's traffic, but a platform-level rate limiter (Vercel Firewall, or Upstash Ratelimit backed by Redis) would be a better fit if traffic grows.

## Steps

1. **Push this repository to GitHub** (if not already) and import it into Vercel as a new project.
2. **Provision a Postgres database** — Neon or Supabase both work; either gives you a `DATABASE_URL` connection string.
3. **Provision object storage** — create a bucket with your chosen provider:
   - **Cloudflare R2** (recommended): create a bucket in the Cloudflare dashboard, create an API token scoped to it, note the account-id-based endpoint (`https://<account-id>.r2.cloudflarestorage.com`).
   - **Supabase Storage**: create a bucket in your Supabase project; use its S3-compatible endpoint (Project Settings → Storage → S3 Connection) and an access key pair.
   - **AWS S3**: create a bucket and an IAM user/role with read/write access to it; omit `S3_ENDPOINT` (defaults to real AWS).
4. **Set environment variables** in the Vercel project settings:
   - `DATABASE_URL` — the connection string from step 2.
   - `SESSION_SECRET` — a long random string (32+ characters) used to sign session cookies. Generate one with `openssl rand -base64 32`. Do not reuse the local `.env` value.
   - `S3_BUCKET`, `S3_REGION`, `S3_ENDPOINT` (omit for real AWS S3), `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` — from step 3. See `.env.example` for the exact names.
5. **Run migrations against the production database** before the first deploy (or as part of your deploy pipeline):
   ```bash
   DATABASE_URL="<production-url>" npm run db:migrate:deploy
   ```
   This runs `prisma migrate deploy` — the non-interactive, production-safe counterpart to `prisma migrate dev` used locally. It applies existing migrations only; it never generates new ones or prompts for confirmation.
6. **Deploy.** Vercel will run `npm install` (which triggers `postinstall: prisma generate`) and `npm run build` automatically.
7. **Visit the deployed URL.** With no `Estate` row yet, you'll land on `/setup` — this creates the estate and the first Admin account, exactly like local development.
8. **Smoke test**: log in as that Admin, set the chairman name/signature under Settings, add a living-space type/fee, a landlord, a house, and a tenant; log in as the tenant and submit a payment; validate it as Admin; confirm the certificate PDF downloads with the signature on it and its QR code resolves at `/verify/[token]`.

## What doesn't need attention

Everything else — the auth/session system, the service-layer authorization model, the data model, Tailwind build — is framework-standard and needs no deployment-specific changes. `next.config.ts` has no custom build overrides that would conflict with Vercel's defaults.
