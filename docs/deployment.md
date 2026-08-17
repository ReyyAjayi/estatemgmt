# Deployment Guide

This app was built to deploy on **Vercel**, with a managed Postgres provider and S3-compatible object storage, per the Phase 0 architecture decision (`docs/phase-0-discovery.md` §4). This guide covers what's needed to go live.

## Two decisions that block a real deploy

These aren't code problems — they're waiting on you:

1. **Proof-of-payment storage** (`PRODUCT_DECISIONS.md` #25). `src/lib/storage.ts` currently writes uploaded proof-of-payment files to local disk (`.data/uploads/`). This works for local development but **will not work on Vercel** — its filesystem is ephemeral and mostly read-only outside `/tmp`, so uploaded files would vanish or fail to save. Before deploying, this module needs to be swapped for a real object-storage client (Supabase Storage or Cloudflare R2 were the Phase 0 recommendation). The module's interface (`saveProofFile`/`readProofFile`/`proofFileContentType`) is deliberately small and isolated so this is a contained change, not a rewrite — but it does need your decision on which provider, and an account to configure it against.
2. **Chairman name/signature on certificates** (`PRODUCT_DECISIONS.md` #39). `Estate.chairmanName`/`chairmanSignatureUrl` exist in the schema but there's no Admin settings screen to set them yet, so certificates currently render without a signature line. Not a hard blocker — certificates work fine without it — but worth deciding whether it's needed before residents start receiving them.

## Also worth knowing before higher-traffic production use

- **Login rate limiting is in-memory** (`src/lib/rate-limit.ts`), keyed per server process. It works correctly on a single long-running server, but doesn't share state across multiple serverless instances — on Vercel, different requests can land on different warm instances, so the limit is "per instance," not truly global. It's a reasonable stopgap on top of the existing per-account/per-house lockout for a single estate's traffic, but a platform-level rate limiter (Vercel Firewall, or Upstash Ratelimit backed by Redis) would be a better fit if traffic grows.

## Steps

1. **Push this repository to GitHub** (if not already) and import it into Vercel as a new project.
2. **Provision a Postgres database** — Neon or Supabase both work; either gives you a `DATABASE_URL` connection string.
3. **Set environment variables** in the Vercel project settings:
   - `DATABASE_URL` — the connection string from step 2.
   - `SESSION_SECRET` — a long random string (32+ characters) used to sign session cookies. Generate one with `openssl rand -base64 32`. Do not reuse the local `.env` value.
4. **Run migrations against the production database** before the first deploy (or as part of your deploy pipeline):
   ```bash
   DATABASE_URL="<production-url>" npm run db:migrate:deploy
   ```
   This runs `prisma migrate deploy` — the non-interactive, production-safe counterpart to `prisma migrate dev` used locally. It applies existing migrations only; it never generates new ones or prompts for confirmation.
5. **Swap the proof-of-payment storage module** (see decision #1 above) before real tenants start uploading files.
6. **Deploy.** Vercel will run `npm install` (which triggers `postinstall: prisma generate`) and `npm run build` automatically.
7. **Visit the deployed URL.** With no `Estate` row yet, you'll land on `/setup` — this creates the estate and the first Admin account, exactly like local development.
8. **Smoke test**: log in as that Admin, add a living-space type/fee, a landlord, a house, and a tenant; log in as the tenant and submit a payment; validate it as Admin; confirm the certificate PDF downloads and its QR code resolves at `/verify/[token]`.

## What doesn't need attention

Everything else — the auth/session system, the service-layer authorization model, the data model, Tailwind build — is framework-standard and needs no deployment-specific changes. `next.config.ts` has no custom build overrides that would conflict with Vercel's defaults.
