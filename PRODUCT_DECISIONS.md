# Product & Technical Decisions Log

This file records significant product and technical decisions made during development, so the reasoning stays available as the project evolves. Update it whenever a decision materially affects how the estate, landlord, tenant, admin or security process works — don't just let it live in chat history.

Each entry: **Decision — Status — Date — Rationale**

---

## Phase 0 — Discovery & Architecture (2026-08-17, confirmed 2026-08-17)

Full analysis in [`docs/phase-0-discovery.md`](docs/phase-0-discovery.md). All decisions below are **Confirmed** by the Product Owner. Phase 1 begins next.

| # | Decision | Status |
|---|---|---|
| 1 | Billing is per active **tenant** (not per house) — each tenant's own living-space type determines their fee, so one house can have multiple tenants owing different amounts. | Confirmed |
| 2 | Tenant login uses **House Code + Tenant Code together**, not Tenant Code alone. | Confirmed |
| 3 | **Admin and Landlord authenticate with phone/email + password**; only Tenant uses the lightweight code-pair login. Security uses individual username/phone + password accounts created by Admin. | Confirmed |
| 4 | Certificate/QR verification requires an **authenticated Security/Admin/Landlord session** — not publicly accessible without login. Rationale: gate scanning is a fallback only (defaulters are already known from the dashboard), and Security is already logged in during their shift for the normal lookup flow, so gating adds no delay. | Confirmed |
| 5 | **No proration** for mid-year tenant move-ins; annual fee applies in full regardless of move-in month. | Confirmed |
| 6 | **No partial payments, ever** — not just deferred. A due is only VALIDATED once the full amount is confirmed, regardless of when the tenant moved in. | Confirmed |
| 7 | Fee amounts are **snapshotted onto each `TenantDue`** at creation time (not computed live from the current `Fee` table), so history stays accurate if fees change later. | Confirmed |
| 8 | Deactivating a tenant is a soft flag (`status = inactive`) — never a delete. Historical dues/payments/certificates remain intact and visible to Admin. **Landlords can request deactivation of their own tenant; only Admin can perform the final deactivation.** | Confirmed |
| 9 | Proof-of-payment "compress → archive" is simplified to: compress on upload, store once in private object storage, mark `archived` as a logical flag (no physical data-tier migration). | Confirmed |
| 10 | Co-tenants can see each other's **name and payment status only** — never phone number, proof-of-payment, or amounts. | Confirmed |
| 11 | Reporting in MVP = the filterable dashboard table + CSV export. No charts/analytics yet. | Confirmed |
| 12 | Reminders in MVP are **in-app status only** — no SMS/WhatsApp integration yet, though phone numbers are captured from day one so it can be added later without a data migration. | Confirmed |
| 13 | Tech stack: **Next.js (TypeScript) + PostgreSQL + Prisma + Tailwind/shadcn**, hosted on Vercel with a managed Postgres provider (Neon or Supabase) and S3-compatible object storage. Single monolithic app, no microservices. | Confirmed |
| 14 | **First Admin is provisioned via estate self-registration**: a one-time "set up your estate" flow creates the `Estate` record and the first Admin account together, gated only by whether an `Estate` row already exists. No seed script, no open self-registration for other roles. | Confirmed |
| 15 | **Landlord and Security accounts are created by Admin in-app**, with an initial password set by Admin and shared out of band (phone/WhatsApp) — no email/SMS-based self-registration or automated password reset in MVP. A locked-out Landlord/Security user gets their password reset by Admin directly. | Confirmed |

---

## Phase 1 — Foundation (2026-08-17)

Built the authentication/authorization skeleton: Next.js + Prisma project scaffold, the full Phase 0 data model as migrations, estate self-registration, staff (Admin/Landlord/Security) password login, tenant House Code + Tenant Code login, role-protected placeholder dashboards, and login lockout. No estate/tenant/payment management UI yet — that's Phase 2+.

| # | Decision | Status |
|---|---|---|
| 16 | **No NextAuth/Auth.js** — session handling is a small hand-rolled module (`src/lib/session.ts`) using signed JWT cookies via `jose`, with `bcryptjs` for password hashing. Chosen for transparency and to avoid chasing framework-compatibility issues on Next.js 16, which is days old and just renamed core primitives (`middleware` → `proxy`). Not a reversal of a confirmed decision — Phase 0's decision #13 named the framework/DB/ORM, not a specific auth library. | Decided during build |
| 17 | **Route protection lives in each page's server code (`requireRole()`), not in `proxy.ts`.** The proxy file does a cheap "is there a session cookie at all" redirect for unauthenticated requests only; it is explicitly not trusted for authorization, matching Next.js's own guidance and the Phase 0 principle of enforcing access at the backend, not the routing layer. | Decided during build |
| 18 | **House Code + Tenant Code lockout is tracked on the `House`, not the `Tenant`.** A wrong tenant-code guess can't be attributed to a specific tenant record (that's the point of a random-token credential) — only a correct-house/wrong-tenant-code pattern is attributable, and that's a House-level signal. 5 failed attempts locks that house's tenant login for 15 minutes. | Decided during build |
| 19 | **Prisma 7 requires an explicit driver adapter** (`@prisma/adapter-pg` + `pg`) — connecting via a bare `DATABASE_URL` on the client is no longer supported as of this major version. Noted here only because it affects how `DATABASE_URL` is wired up (`src/lib/prisma.ts`), not a product decision. | Noted |

### What was tested

Full journeys were exercised against a local Postgres instance with a headless browser (estate setup → admin dashboard; staff login for Admin/Landlord/Security with correct and incorrect passwords; tenant login with correct and incorrect House Code/Tenant Code pairs; role-mismatch redirects; unauthenticated redirects to `/login`; logout; and the House-level lockout after 5 failed tenant-login attempts, including confirming the *correct* code is also rejected while locked). All checks passed.

---

*(Future phases append below this line, most recent first.)*
