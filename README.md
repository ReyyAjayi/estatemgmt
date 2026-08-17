# Estate Dues & Resident Management System

An MVP application for managing estate houses, landlords, tenants, security/estate dues, payments and digital payment clearance for a single estate.

The core objective: let estate management see who has paid and who hasn't, so the security gate doesn't have to act as the payment-verification checkpoint.

## Project status

**All eight phases of the original roadmap are complete** — Phase 0 (Discovery & Architecture) through Phase 8 (Polish & Hardening).

- Phase 1: estate self-registration, staff (Admin/Landlord/Security) password login, tenant House Code + Tenant Code login, role-protected dashboards, login lockout.
- Phase 2: Admin & Landlord CRUD for houses, tenants, living-space types and fees; House Code/Tenant Code generation and display; Landlord-initiated tenant deactivation requests with Admin confirmation.
- Phase 3: tenants see their payment status and amount due, and can submit a bank-transfer payment with proof of payment; Admin (and Landlord, read-only) get the payment dashboard from the product spec — totals, filters, and the defaulter table.
- Phase 4: Admin review queue to validate/reject submitted payments with notes, cash payment recording (marks paid immediately), and payment history views for Admin (filterable), Landlord (read-only) and Tenant (their own attempts, including rejection reasons).
- Phase 5: a certificate is issued automatically the moment a due is validated; tenants can view/download their own PDF certificate with a QR code, and Admin/Landlord/Security can resolve that QR (or a shared link) through a gated `/verify/[token]` page showing CLEAR status with no financial detail.
- Phase 6: Security's own dashboard — search by house number (shows every tenant in that house) or tenant code, returning only CLEAR/NOT CLEAR and names. Scanning a certificate's QR with any phone camera app already opens the same verification page from Phase 5, so no separate in-app scanner was needed.
- Phase 7: outstanding tenants can tell the estate when they plan to pay; Admin and Landlord see a "Promised by X" / "Overdue — promised X" / "No promise given" flag per tenant, plus a new Overdue stat tile that only counts dues with no valid current promise.
- Phase 8: a mobile-viewport pass (fixed one real issue — tables now scroll horizontally instead of wrapping into cramped cells), CSV export on the Admin payments dashboard, a per-IP login rate limiter on top of the existing account lockout, friendly global error/404 pages verified against a real forced failure, and a deployment guide (`docs/deployment.md`).
- Phase 8 follow-up: proof-of-payment and chairman-signature storage now supports a real S3-compatible backend (Cloudflare R2 / Supabase Storage / AWS S3 — same code, just env vars) with local disk as a dev-only fallback; Admin can now set the chairman name and upload a signature from a new **Settings** screen, and both appear on certificates automatically.

**Before deploying, one thing is still genuinely on you:** provisioning the actual storage bucket and Postgres database — the code supports both, but creating the accounts and setting the connection details is a Product Owner step. See `docs/deployment.md` for exact steps and env var names.

- [`docs/phase-0-discovery.md`](docs/phase-0-discovery.md) — full requirements analysis, architecture, data model, roles/permissions, screens, roadmap, and open decisions.
- [`docs/deployment.md`](docs/deployment.md) — how to deploy, what's blocking it, and what to check before going live.
- [`PRODUCT_DECISIONS.md`](PRODUCT_DECISIONS.md) — running log of significant product/technical decisions.

## Stack

Next.js (TypeScript, App Router) + PostgreSQL + Prisma + Tailwind CSS. See `docs/phase-0-discovery.md` §4 for the rationale.

## Running locally

Prerequisites: Node.js 22+, a PostgreSQL database.

```bash
npm install
cp .env.example .env   # then fill in DATABASE_URL and SESSION_SECRET
npx prisma migrate dev
npm run dev
```

Visit `http://localhost:3000`. Since no estate exists yet, you'll land on **Set up your estate** — this one-time form creates the estate and your Admin account together.

From the Admin dashboard you can now add living-space types & fees, landlords (a one-time temporary password is shown for you to share), houses (assigned to a landlord, with an auto-generated House Code), and tenants (with an auto-generated Tenant Code) — or sign in as a Landlord to do the equivalent for their own houses/tenants.

To quickly populate a Security account too (Security has no self-service creation UI, same as Landlord — both are Admin-created in-app), seed a dev fixture **after** completing the setup step above:

```bash
npm run db:seed
```

This prints a Landlord login, a Security login, and a House Code + Tenant Code pair to the terminal. It's a dev-only convenience script, not part of the real onboarding flow (see `PRODUCT_DECISIONS.md` #14–15).

Further documentation will be added here as each phase is built.
