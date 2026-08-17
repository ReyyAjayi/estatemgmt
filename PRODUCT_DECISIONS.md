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

## Phase 2 — Core Estate Data (2026-08-17)

Built Admin & Landlord CRUD for houses, tenants, living-space types and fees — the data Phase 3's payment/defaulter dashboard will run on. All authorization is enforced in a service layer (`src/lib/services/*`), not just by which page links where, per the Phase 0 architecture principle: every service function re-derives the viewer's scope from their session, so a Landlord can never read or write another landlord's houses/tenants even if they call a server action directly.

| # | Decision | Status |
|---|---|---|
| 20 | **Landlord and Security initial passwords are auto-generated**, not typed by Admin, and shown once after creation for Admin to copy and share out of band — same pattern as House/Tenant codes, and avoids weak Admin-chosen passwords. Admin can regenerate a new one at any time ("Reset password"). | Decided during build |
| 21 | **Admin can create/edit tenants directly (any house), not only Landlords** — this was already in the Phase 0 permissions table (§6) but is worth restating: both roles share the same `createTenant`/`createHouse` service functions, which branch on session role internally rather than having separate Admin/Landlord code paths. | Confirmed (Phase 0 §6), implemented |
| 22 | **Tenant deactivation is two-step in the UI**: Landlord's "Request deactivation" only ever sets a request flag; Admin's tenant list shows a "Deactivation requested by landlord" badge with **Deactivate** and **Dismiss request** actions. Deactivating clears the request flag and sets `moveOutDate` to today. Admin can also deactivate a tenant with no prior request. | Decided during build |
| 23 | **Fee amounts are entered in the UI as whole Naira** (e.g. "20000") and converted to kobo for storage (`src/lib/currency.ts`); display does the reverse. This is purely a UI/storage boundary, not a currency decision — NGN-only remains as decided in Phase 0. | Decided during build |

### What was tested

Full CRUD + permission-boundary journeys were exercised against a local Postgres instance with a headless browser: Admin adding a living-space type and fee, creating a Landlord (capturing the one-time temp password), creating a House assigned to that Landlord (capturing the House Code), creating a Tenant in that house (capturing the Tenant Code); the new Landlord logging in with the temp password and seeing only their own house; a Landlord being bounced out of `/admin/*`; a Landlord creating their own house and tenant; a *different* seeded Landlord confirmed **not** able to see the new Landlord's houses (the core isolation guarantee); a Landlord requesting deactivation of a tenant; Admin seeing the pending request and deactivating the tenant, whose status then shows Inactive. All 18 checks passed.

---

## Phase 3 — Payment Submission & Defaulter Visibility (2026-08-17)

Built the payment core: `TenantDue` generation, tenant bank-transfer submission with proof upload, and the Admin payment dashboard from spec §9. This is the phase that delivers the product's stated core objective — estate management can now see who has paid without stopping anyone at the gate.

| # | Decision | Status |
|---|---|---|
| 24 | **`TenantDue` records are generated lazily, not by a cron job.** `ensureDuesForYear()` runs at the top of every payments-related page load (idempotent — skips tenants who already have one) rather than needing background infrastructure. Matches the Phase 0 "no unnecessary complexity" call on reminders/schedules. A tenant whose living-space type has no fee configured for that year is silently skipped (can't bill without a configured fee) — the Admin dashboard surfaces this as a small "N tenants have no fee configured" note rather than failing. | Decided during build |
| 25 | **Proof-of-payment files are stored on local disk for now** (`src/lib/storage.ts`, under a gitignored `.data/` directory), not the S3-compatible object storage recommended in Phase 0 §4. **This will not work once deployed** — Vercel's filesystem is ephemeral and mostly read-only outside `/tmp`. The module is written as a small, isolated interface (`saveProofFile`/`readProofFile`) specifically so swapping in Supabase Storage or Cloudflare R2 later is a contained change, not a rewrite. **Needs your decision before deployment**: do you have a Supabase/R2/S3 account already, or should I set one up when we get to deployment? | **Needs PO decision before deploying** |
| 26 | **Proof files are served through an authenticated route** (`/api/proofs/[key]`), not a public URL — only Admin or the submitting tenant can fetch one, checked on every request. This is the same protection a signed object-storage URL would give, so it carries over unchanged when the storage backend is swapped. | Decided during build |
| 27 | **Resubmission is blocked while a payment is already `PAYMENT_SUBMITTED` or `VALIDATED`.** A tenant can submit again once a submission is `REJECTED` (Phase 4 will add rejection) or if the due is still `NOT_PAID`. Prevents duplicate/confusing attempts piling up before Admin reviews the first one. | Decided during build |
| 28 | **Dashboard "Outstanding" combines `NOT_PAID` and `REJECTED`** — both need follow-up from the estate's perspective — while the status filter still exposes all four statuses individually for precise filtering. | Decided during build |
| 29 | **Landlord gets a read-only Payments view** (`/landlord/payments`, same totals + table, no filters) — this was already in the Phase 0 screens list (§7) but hadn't been built yet; added now since it reuses the same scoped service function as Admin's view. | Confirmed (Phase 0 §7), implemented |

### What was tested

Full payment-submission and dashboard journeys were exercised against a local Postgres instance with a headless browser: a fresh tenant seeing the correct OUTSTANDING status and exact fee amount; submitting a bank-transfer payment with a reference number and an uploaded proof file; the status flipping to "SUBMITTED — AWAITING REVIEW" and the submission form disappearing (no duplicate submissions); the Admin payments dashboard showing correct totals and, filtered to the new house, the tenant's row with the right status and a working proof link; and — the important one — the proof-file authorization boundary: Admin gets the file (200), the submitting tenant gets their own file (200), a different, unrelated logged-in user gets refused (403), and an anonymous request gets refused (401). 17/17 checks passed.

---

## Phase 4 — Payment Validation (2026-08-17)

Built the Admin review queue (validate/reject submitted bank-transfer payments with notes), cash payment recording, and payment history views for all three roles. Together with Phase 3, this closes the loop: a tenant submits, Admin decides, and everyone sees the outcome.

| # | Decision | Status |
|---|---|---|
| 30 | **Cash payments are recorded and validated by Admin in one step** — there's no separate review stage, since Admin is confirming cash they're holding in person. Blocked while a bank-transfer submission is already awaiting review for the same due, so Admin resolves that one first rather than creating two competing payment records for the same year. | Decided during build |
| 31 | **Rejecting a payment requires a note; validating does not.** The tenant needs to know what to fix before resubmitting (per Phase 0 §2.4's resubmission flow); a validation is self-explanatory. The note is shown to the tenant on their dashboard's payment history. | Decided during build |
| 32 | **Payment history is scoped identically to the existing dues/payments views**: Admin sees everything (filterable by year/house/landlord/status), Landlord sees only their own tenants (read-only, no filters — same pattern as their Payments dashboard), Tenant sees only their own payment attempts. Reuses `ownLandlordId`/session-scoping already established in Phase 2-3, not a new authorization model. | Decided during build |
| 33 | **The Admin Payments dashboard, review queue, cash form and history page share an in-page sub-nav** (`PaymentsSubNav`) rather than adding four new top-level nav items — keeps the main nav from growing every phase. The review queue's pending count surfaces as a badge on that tab and as a line on the Admin home dashboard, so a backlog is never silently missed. | Decided during build |

### What was tested

Full validation journeys were exercised against a local Postgres instance with a headless browser: two tenants submitting bank-transfer payments, Admin validating one and rejecting the other with a reason; the rejected tenant seeing the reason on their dashboard and successfully resubmitting; Admin recording a cash payment for a third tenant and it immediately showing as paid; the Admin payments dashboard and history page reflecting all three outcomes correctly when filtered to the test house; the Landlord's read-only history view showing the same three outcomes scoped to their own tenants only. Also re-confirmed the authorization boundary from Phase 0 §"Landlord over-reach": a Landlord is redirected away from `/admin/payments/review`, `/admin/payments/cash` and `/admin/payments/history` even when navigating there directly by URL. 27/27 + 4/4 checks passed.

### What's still open

No certificate/QR generation yet — a `VALIDATED` due doesn't yet produce a `Certificate` row. That's Phase 5 per the roadmap (`docs/phase-0-discovery.md` §8), along with security gate lookup. Proof-of-payment storage remains on local disk (decision #25, still needs your input before deployment).

---

## Phase 5 — Digital Certificate (2026-08-17)

Built certificate generation on validation, PDF download, and the gated QR/link verification lookup — the pieces named in `docs/phase-0-discovery.md` §8 for this phase. Security's own dedicated search/scan screen is Phase 6; this phase only wires up the verification page itself and confirms Security *can* use it once logged in.

| # | Decision | Status |
|---|---|---|
| 34 | **A `Certificate` row is created automatically inside the same transaction that flips a `TenantDue` to `VALIDATED`** — both `validatePayment` and `recordCashPayment` now run as interactive transactions that call a shared `issueCertificate()`, rather than a separate step Admin has to trigger. There's no scenario in the current rules where a due leaves `VALIDATED` once reached (no resubmission once validated — Phase 3 decision #27), so one certificate per due for its lifetime. | Decided during build |
| 35 | **The QR token is a separate, high-entropy opaque value from the human-readable certificate number** — `qrToken` (crypto-random, URL-safe, embedded in the QR/verify link) is the actual credential; `certificateNumber` (`CERT-{year}-{code}`) is just a label printed for humans to read or quote over the phone. Guessing a certificate number should not make guessing a QR token any easier. | Decided during build |
| 36 | **The gated verification page (`/verify/[token]`) shows CLEAR + tenant name + house number + year only — never amounts, references, or payment method.** Matches the Phase 0 minimal-disclosure requirement for gate-adjacent lookups. Since a `Certificate` only ever exists for a `VALIDATED` due, resolving a real token always yields CLEAR; an invalid, foreign, or (for Landlord) out-of-scope token renders the same generic "not found," so a scan can't be used to probe which tokens exist or which tenants belong to which landlord. | Decided during build |
| 37 | **Landlord verification is scoped to their own tenants; Admin and Security can resolve any certificate in the estate.** Download is narrower still: Admin any, Landlord their own tenants', Tenant their own only, and **Security can verify but never download a PDF** — this matches the Phase 0 permissions table exactly ("Security: verify only, no download"). | Confirmed (Phase 0 §6), implemented |
| 38 | **The QR's absolute URL is derived from the incoming request's `Host`/`X-Forwarded-Proto` headers at render time**, not a configured `APP_URL` env var — one fewer setting to keep in sync across local dev and wherever this deploys later. | Decided during build |
| 39 | **Certificates render without a chairman name/signature for now** — Phase 0 decision #8 named that as a one-time Estate-level asset, but no Admin settings screen exists yet to capture it, and building one wasn't in this phase's scope (`docs/phase-0-discovery.md` §8 names PDF/QR/verification for Phase 5, not estate settings). The `Estate.chairmanName`/`chairmanSignatureUrl` columns already exist in the schema from Phase 1, so this is a small follow-up whenever it's wanted — not a data model change. | Decided during build — flagged as a follow-up |

### What was tested

Full journeys were exercised against a local Postgres instance with a headless browser: a tenant's payment validated by Admin issues a certificate automatically; the tenant sees a "View certificate" link on their dashboard, an on-page QR code, and can download a PDF (verified as `application/pdf`, HTTP 200) of their own certificate; Admin's payments dashboard shows a working "Certificate" link per validated row that resolves through `/verify/[token]` showing CLEAR with no financial data; the owning Landlord can resolve the same link; a **different** Landlord gets a generic "NOT FOUND" on the verify page and a 403 attempting the PDF download directly; Security can verify (sees CLEAR) but gets a 403 on the PDF download; an anonymous request to the verify page is redirected to `/login`. 19/19 checks passed.

### What's still open

Security's own dedicated search/scan lookup screen (search by house number or tenant code, minimal CLEAR/NOT CLEAR result) is Phase 6, not this phase — today Security can only reach `/verify/[token]` via a link or scanned QR, with no in-app search UI yet. Chairman name/signature capture (decision #39) and proof-of-payment object storage (decision #25) remain open follow-ups.

---

## Phase 6 — Security Role (2026-08-17)

Built Security's own screen: search by house number or tenant code, returning only CLEAR/NOT CLEAR + names. The QR-scan half of "search/scan lookup" from the roadmap turned out to need no new code — see decision #41.

| # | Decision | Status |
|---|---|---|
| 40 | **A house-number search returns every active tenant in that house, each with their own CLEAR/NOT CLEAR** — houses can have multiple tenants with independent dues (Phase 0 decision #1), so a single combined status for the house would hide a defaulting housemate. A tenant-code search always returns exactly one tenant, since codes are per-tenant. | Decided during build |
| 41 | **No in-app camera QR scanner was built.** The certificate QR already encodes a full URL to `/verify/[token]` (Phase 5), so scanning it with any phone's stock camera app opens that page directly — Security logs in there once and every scan afterward just works. Building a custom in-page scanner (camera permissions, a JS decoding library, mobile testing) would duplicate that for no gain, and Phase 0 already framed gate scanning as a fallback, not the primary flow. | Decided during build |
| 42 | **An unmatched search query and a query matching a house with zero active tenants get distinct messages** ("no house or tenant matches" vs. "no active tenants") — both are informational only, neither discloses anything about who exists that the other doesn't already imply from the query the user themselves typed. | Decided during build |

### What was tested

Full journeys were exercised against a local Postgres instance with a headless browser: a house with two tenants — one validated, one still unpaid — searched by house number correctly shows both names with independent CLEAR/NOT CLEAR badges and no amounts anywhere on the page; searching by that validated tenant's code returns exactly that one tenant, CLEAR; an unmatched query shows a generic no-match message; Admin and Landlord logins are still bounced away from `/security` (unchanged from earlier phases — Security's screen isn't shared); an anonymous request redirects to `/login`. 14/14 checks passed.

### What's still open

Phase 0's original roadmap for Security ends here (§8) — the remaining phases are Phase 7 (expected-payment-date / promise-to-pay) and Phase 8 (mobile polish, CSV export, login rate-limiting, deployment finalization). Proof-of-payment object storage (#25) and chairman name/signature capture (#39) remain open pre-deployment follow-ups.

---

*(Future phases append below this line, most recent first.)*
