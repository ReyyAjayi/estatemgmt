# Product & Technical Decisions Log

This file records significant product and technical decisions made during development, so the reasoning stays available as the project evolves. Update it whenever a decision materially affects how the estate, landlord, tenant, admin or security process works — don't just let it live in chat history.

Each entry: **Decision — Status — Date — Rationale**

---

## Phase 0 — Discovery & Architecture (2026-08-17)

Full analysis in [`docs/phase-0-discovery.md`](docs/phase-0-discovery.md). Key decisions below are **Proposed**, pending Product Owner approval before Phase 1 begins.

| # | Decision | Status |
|---|---|---|
| 1 | Billing is per active **tenant** (not per house) — each tenant's own living-space type determines their fee, so one house can have multiple tenants owing different amounts. | Proposed |
| 2 | Tenant login uses **House Code + Tenant Code together**, not Tenant Code alone. | Proposed |
| 3 | **Admin and Landlord authenticate with phone/email + password**; only Tenant uses the lightweight code-pair login. Security uses individual username/phone + password accounts created by Admin. | Proposed |
| 4 | Certificate/QR verification requires an **authenticated Security/Admin/Landlord session** — not publicly accessible without login. | Proposed |
| 5 | **No proration** for mid-year tenant move-ins; annual fee applies in full regardless of move-in month. | Proposed |
| 6 | **No partial payments** in MVP — a due is only VALIDATED once the full amount is confirmed. | Proposed |
| 7 | Fee amounts are **snapshotted onto each `TenantDue`** at creation time (not computed live from the current `Fee` table), so history stays accurate if fees change later. | Proposed |
| 8 | Deactivating a tenant is a soft flag (`status = inactive`) — never a delete. Historical dues/payments/certificates remain intact and visible to Admin. | Proposed |
| 9 | Proof-of-payment "compress → archive" is simplified to: compress on upload, store once in private object storage, mark `archived` as a logical flag (no physical data-tier migration). | Proposed |
| 10 | Co-tenants can see each other's **name and payment status only** — never phone number, proof-of-payment, or amounts. | Proposed |
| 11 | Reporting in MVP = the filterable dashboard table + CSV export. No charts/analytics yet. | Proposed |
| 12 | Reminders in MVP are **in-app status only** — no SMS/WhatsApp integration yet, though phone numbers are captured from day one so it can be added later without a data migration. | Proposed |
| 13 | Tech stack: **Next.js (TypeScript) + PostgreSQL + Prisma + Tailwind/shadcn**, hosted on Vercel with a managed Postgres provider (Neon or Supabase) and S3-compatible object storage. Single monolithic app, no microservices. | Proposed |

Open questions still requiring an explicit answer from the Product Owner are listed in §10 of `docs/phase-0-discovery.md` (currently: landlord self-deactivation of tenants, and first-admin provisioning approach).

---

*(Future phases append below this line, most recent first.)*
