# Phase 0 — Discovery & Architecture

Status: **Approved** (Phase 0 decisions confirmed by Product Owner 2026-08-17; Phase 1 to follow)
Date: 2026-08-17

This document is the output of Phase 0 only. No application code has been written. Its purpose is to analyse the product specification, surface gaps and risks, and propose an architecture, data model and phased roadmap for approval before any implementation begins.

---

## 1. Requirements Analysis Summary

The core business objective is clear and sound: **give estate management a real-time picture of who has paid, so the security gate never has to act as the payment-verification checkpoint.** Everything in the data model and workflows should serve that single objective. Where a feature doesn't clearly serve it, it's been pushed to a later phase or flagged as unnecessary for MVP.

The four roles (Admin, Landlord, Tenant, Security) have a natural privilege gradient — Admin (full) → Landlord (own houses/tenants) → Tenant (self + household) → Security (status lookup only) — which maps cleanly onto row-level, backend-enforced access rules rather than a general-purpose permissions engine.

## 2. Ambiguities & Missing Requirements

These need a decision before or during Phase 1. Recommendations are given; see also §10 for the specific questions.

1. **Fee billing unit.** The spec bills "per tenant, per living-space type," but a House can hold multiple tenants with *different* space types (dashboard example: House A01 has John/2BR and Mary/1BR). Recommendation: bill **per active tenant record**, not per house. A house is a container; each tenant inside it carries its own space type, fee and payment status. This matches the dashboard example and avoids inventing a separate "Unit" entity. True roommates sharing one room and splitting one fee are out of scope for MVP — the landlord registers one tenant of record for that room.
2. **Due cycle & proration.** The spec's example is an annual due ("2026 Security Due"). Not specified: what happens when a tenant moves in mid-year — do they owe the full annual fee or a prorated amount? Recommendation: **no proration in MVP** — full-year fee regardless of move-in month. Simpler, and estates commonly operate this way. Revisit if it causes disputes.
3. **Partial payments.** Not addressed. Recommendation: **MVP requires full payment** to move a due to VALIDATED. Partial payments add real complexity (running balances, multiple receipts) with no stated need yet.
4. **Resubmission after rejection.** Not addressed. Recommendation: a REJECTED payment can be resubmitted by the tenant, creating a new payment attempt against the same year's due; the due keeps its full history.
5. **What tenants can see about housemates.** Spec says tenants may see "relevant information about other tenants in their house where appropriate" — vague, and in tension with the privacy principle in §16. Recommendation: a tenant may see co-tenants' **name and payment status only** (e.g. "Mary — PAID"). Never phone number, payment proof, amounts, or history of a co-tenant.
6. **QR/certificate verification exposure.** Spec asks for QR verification that Security can use, but doesn't say whether verification should be public (scan → see result, no login) or restricted to authenticated Security/Admin/Landlord. Public verification is convenient but leaks house number + tenant name to anyone who photographs a certificate. Recommendation (see §10, needs your decision): **gate verification behind a Security/Admin/Landlord login**, encode only an opaque certificate token in the QR, and show minimal fields (house, tenant first name, status, year) on successful lookup.
7. **Landlord/Admin authentication strength.** The spec's "House Code / Tenant Code" model is described in the context of tenant access. Applying a bare code as the *only* credential to Landlord and Admin accounts (who can create/edit records) is too weak for the privilege they hold. Recommendation: Landlord and Admin use **phone/email + password**; only Tenant uses the lightweight code-based login (see §5 of architecture below). Flagged in §10 for your confirmation since it deviates from a literal reading of "keep authentication simple."
8. **Chairman signature.** Is the signature a one-time estate-level asset (uploaded once, reused on every certificate) or something applied per-certificate? Recommendation: **one Estate-level record** (chairman name + signature image), reused automatically.
9. **Currency.** Examples use ₦ (Naira). Recommendation: hard-code NGN for MVP display formatting, but store amounts as plain integers (kobo or naira, TBD) so multi-currency isn't precluded later.
10. **Proof-of-payment "compress/archive" pipeline.** Read literally this implies a multi-stage storage pipeline. Recommendation: **simplify** — compress/resize the image at upload time, store once in object storage, and mark the record `archived` (a boolean/flag) after validation purely to control what appears in the "needs attention" queue. No physical data movement between tiers — that's infrastructure complexity with no MVP benefit.
11. **Reporting.** "Basic reports" is undefined. Recommendation: MVP reporting = the filterable dashboard table plus a **CSV export** of it. No charts/analytics in MVP.
12. **Multiple houses per landlord.** Not restricted in the spec. Recommendation: allow it — no extra complexity, and it's realistic.
13. **Reminders without SMS.** Spec accepts deferring SMS/WhatsApp. Recommendation: MVP reminders are **in-app only** (a banner/status on the tenant dashboard) plus the phone number being visible to Admin so they can call/WhatsApp manually. Data model captures everything needed to bolt on real SMS/WhatsApp later without migration.

## 3. Risks & Challenges (Critical Review)

- **Code-based tenant login is possession-based, not knowledge-based.** Two codes (House Code + Tenant Code) are more resistant to guessing than a name, but if a landlord posts the House Code publicly (e.g. on a notice board) and a Tenant Code leaks (photographed, shared casually), someone can view that tenant's payment status and proof-of-payment history. Mitigation: rate-limit/lock login attempts, make codes long enough to resist brute force (e.g. 8+ random alphanumeric characters, not sequential), and let Landlord/Admin regenerate a Tenant Code on request (equivalent to a password reset) if a tenant suspects compromise.
- **Public QR verification is an information-disclosure risk** if not gated (see ambiguity #6). Recommended default: require Security/Admin/Landlord login to resolve a scanned code.
- **Landlord over-reach.** A landlord could try to mark their own tenant's payment as validated. This must be **impossible** — only Admin can validate payments, regardless of UI. Enforce at the backend, not just by hiding the button.
- **Deactivation ≠ deletion, but must not hide debt.** An inactive tenant with an unpaid due should stay visible to Admin as a historical defaulter for potential recovery, even though they're excluded from the "current active tenants" dashboard. Don't let "Inactive" become a way to make outstanding debt disappear from view.
- **Proof-of-payment storage cost/privacy.** Images may contain bank account numbers or other personal financial data belonging to the tenant (and sometimes a third party who made the transfer on their behalf). Store in private object storage (never a public bucket), serve via short-lived signed URLs, and restrict access to Admin only.
- **Single point of trust: Admin validates everything.** With one estate, this is fine and matches the "simple over scalable" instruction, but it does mean the whole payment-integrity chain rests on Admin diligence — there's no maker-checker step. Acceptable for MVP; worth revisiting if fraud becomes a concern.
- **Over-engineering temptation.** A generic RBAC/permissions table, microservice split, or event-driven architecture would all be premature for 4 fixed roles and one estate. Recommendation below uses plain backend permission checks instead.

## 4. Recommended Technology Stack

| Layer | Choice | Why |
|---|---|---|
| Application framework | **Next.js (React + TypeScript), App Router** | One codebase for UI + backend (API routes/server actions). Excellent mobile-responsive support, huge ecosystem, fast iteration — fits "working MVP quickly" better than splitting frontend/backend into two services. |
| Styling/UI | **Tailwind CSS + shadcn/ui** | Fast to build clean, accessible, mobile-first screens without a design team; large touch targets and simple layouts come naturally. |
| Database | **PostgreSQL** | Clean relational fit for Estate → House → Tenant → Due → Payment; strong constraints/audit-friendly; works with every serious host. |
| ORM/migrations | **Prisma** | Type-safe queries in TypeScript, easy migrations, keeps the backend logic readable for a small team. |
| Auth | **Auth.js (NextAuth) Credentials provider**, custom logic for the two credential types (password for Admin/Landlord/Security, code-pair for Tenant); bcrypt for hashing everything (passwords and codes alike) | Avoids building session/cookie handling from scratch while still allowing our two auth flows. |
| File storage | **S3-compatible object storage** (e.g. Supabase Storage or Cloudflare R2) for payment proofs and the chairman's signature image | Cheap, simple, avoids storing files on ephemeral app-server disk. |
| QR codes | **`qrcode` npm package** | Generates a QR encoding an opaque certificate token/URL; no external service needed. |
| Certificate rendering | **`@react-pdf/renderer`** | Generates the downloadable PDF certificate without needing a headless browser at runtime (lighter than Puppeteer, deploys cleanly to serverless). |
| Hosting | **Vercel** (app) + **Neon or Supabase** (managed Postgres) + **Supabase Storage/R2** (files) | Low-ops, generous free/cheap tiers appropriate for one estate, zero server maintenance. |
| Testing | **Vitest** for business-logic unit tests (fee calculation, permission checks, due-status transitions) | Keep test investment focused on the rules that matter; skip heavy e2e tooling until the app has real users. |

**Alternative considered:** Django + PostgreSQL, using Django's built-in admin panel to shortcut Admin-role CRUD screens. This is a legitimate option and would save time on Admin CRUD specifically, but it means running two different UI paradigms (Django templates/admin vs. a hand-built mobile-first UI for Landlord/Tenant/Security) and a second language boundary. Given every role needs a good mobile experience — not just Admin — a single TypeScript stack end-to-end is the better fit here.

## 5. Data Model

### Entities

- **Estate** — id, name, chairman_name, chairman_signature_url, address. (Single row in MVP; modelled as a table so multi-estate isn't a rewrite later.) Created via a one-time "set up your estate" flow that also creates the first Admin account — the setup screen only allows this while zero `Estate` rows exist, which is the entire access control needed for that flow.
- **LivingSpaceType** — id, estate_id, name (e.g. "1 Bedroom"), active.
- **Fee** — id, living_space_type_id, year, amount. One row per (space type, year); this is what "configurable, not hard-coded" means concretely, and it naturally preserves history (2025's fee doesn't change when 2026's is set).
- **User** — id, role (ADMIN / LANDLORD / TENANT / SECURITY), phone, email (nullable), password_hash (nullable — Tenant doesn't use one), status (active/inactive), created_at. One row per login identity, regardless of role.
- **Landlord** — id, user_id (FK), full_name, phone.
- **House** — id, estate_id, landlord_id, house_number, house_code (unique, random), created_at.
- **Tenant** — id, user_id (FK, nullable until first login setup), house_id, living_space_type_id, full_name, phone, tenant_code (unique, random), status (active/inactive), move_in_date, move_out_date (nullable), deactivation_requested_at (nullable, set by Landlord), deactivation_requested_by (FK → User, nullable), created_at. Landlord sets the two `deactivation_requested_*` fields to raise a request; only Admin flipping `status` to inactive actually deactivates — this keeps the "who can write what" rule enforceable in the backend rather than relying on the Landlord UI simply not showing a deactivate button.
- **Security** — id, user_id (FK), full_name.
- **TenantDue** — id, tenant_id, year, living_space_type_id (snapshot), amount (snapshot from Fee at generation time), status (NOT_PAID / PAYMENT_SUBMITTED / VALIDATED / REJECTED), expected_payment_date (nullable), created_at. One per tenant per year — the anchor record for "do they owe, and what's the status."
- **Payment** — id, tenant_due_id (FK), method (BANK_TRANSFER / CASH), reference_number (nullable), proof_file_url (nullable, required for bank transfer), submitted_at, validated_by (FK → User, nullable), validated_at (nullable), status (SUBMITTED / VALIDATED / REJECTED), notes. Multiple payment attempts can exist per due (e.g. rejected → resubmitted); the due's status reflects the latest relevant attempt.
- **Certificate** — id, tenant_due_id (FK), certificate_number (unique), qr_token (unique, opaque), issued_at, issued_by (FK → User). Generated once a due reaches VALIDATED.
- **AuditLog** *(Phase 2+, not MVP-blocking)* — id, actor_user_id, action, entity_type, entity_id, timestamp, metadata. Payment validation and certificate issuance already carry their own "who/when" fields, which covers the audit-trail requirement for MVP; a generic log table can follow once more actions need tracking.

### Key relationships

```
Estate 1—* LivingSpaceType 1—* Fee (per year)
Estate 1—* House *—1 Landlord (via User)
House 1—* Tenant (via User)
Tenant 1—* TenantDue (one per year)
TenantDue 1—* Payment (attempts)
TenantDue 1—1 Certificate (once VALIDATED)
```

### Notes on the design

- Snapshotting the fee amount onto `TenantDue` at creation time (rather than always computing live from `Fee`) means a mid-year fee change never silently alters an already-issued due, and payment history stays accurate to what was actually owed at the time.
- `house_code` and `tenant_code` are random tokens, not sequential IDs, to resist guessing (see §3).
- Deactivating a tenant only flips `status` — no deletes, and their `TenantDue`/`Payment`/`Certificate` history is untouched, satisfying the "preserve history" requirement.

## 6. Roles & Permissions

Enforced in backend query/service functions, not just hidden in the UI (per your instruction #13).

| Action | Admin | Landlord | Tenant | Security |
|---|:---:|:---:|:---:|:---:|
| View all houses/landlords/tenants | ✅ | own houses only | own house only | ❌ |
| Create/edit houses | ✅ | own houses only | ❌ | ❌ |
| Create/edit tenants | ✅ | own houses' tenants only | ❌ | ❌ |
| Set living-space fees | ✅ | ❌ | ❌ | ❌ |
| Submit payment / proof | ❌ (records cash on tenant's behalf) | ❌ | own payments only | ❌ |
| Validate/reject payments | ✅ | ❌ | ❌ | ❌ |
| Record cash payment | ✅ | ❌ | ❌ | ❌ |
| View payment status | all | own tenants | self (+ co-tenant status only) | via lookup only, no detail |
| View phone numbers | all | own tenants | own only | ❌ |
| View proof-of-payment images | ✅ | ❌ | own only | ❌ |
| Generate/view certificate | ✅ | view own tenants' | own only | verify only, no download |
| Lookup clearance status (search/QR) | ✅ | ✅ (own tenants) | ❌ | ✅ (status only, gated login) |
| Deactivate tenant | ✅ (final action) | can request deactivation | ❌ | ❌ |

## 7. Main Screens & User Journeys

### Admin
- **Dashboard** — totals (active tenants, paid, submitted, outstanding, expected vs actual collection), filterable table by house/landlord/space type/status/year, drill into any tenant.
- **Houses** — list/create/edit, assign landlord.
- **Landlords** — list/create/edit, reset password.
- **Tenants** — list/create/edit, deactivate (including confirming Landlord-requested deactivations from a small queue/flag on the tenant list), view a tenant's full history.
- **Fee configuration** — set amount per living-space type per year.
- **Payment review queue** — list of SUBMITTED payments, open one to see proof + reference, Validate or Reject with a note.
- **Record cash payment** — pick tenant → confirm amount (auto-calculated) → mark VALIDATED immediately.
- **Certificate lookup / verification** — search by house, tenant, or scanned QR token.

### Landlord
- **My houses** — list, create new (system issues House Code), edit.
- **My tenants** — list across all my houses, create new tenant (system issues Tenant Code), assign house + living-space type, request deactivation (Admin confirms).
- **Tenant payment status** — read-only view of who's paid/outstanding among my tenants.

### Tenant
- **Home / "Am I clear?"** — big, obvious PAID / OUTSTANDING / SUBMITTED status for the current year, amount due if outstanding.
- **Submit payment** — choose bank transfer (upload proof + reference) — cash is recorded by Admin, not self-service.
- **Payment history** — past years, statuses, amounts.
- **My certificate** — view/download once VALIDATED, with QR.
- **My household** — co-tenants' names + status only.
- **Provide expected payment date** — simple date picker, shown when outstanding.

### Security
- **Lookup / verify** — search by house number or tenant code, or scan a QR — returns only CLEAR/NOT CLEAR (and house/tenant name for confirmation), nothing financial.

## 8. Application Architecture

- **Single Next.js application**, deployed on Vercel, using the App Router with route groups per role (`/admin/*`, `/landlord/*`, `/tenant/*`, `/security/*`) protected by middleware that checks session role on every request.
- **Server actions / API routes** call into a `lib/services` layer (e.g. `tenants.ts`, `payments.ts`, `dues.ts`) that owns all authorization checks and business rules (fee lookup, due-status transitions). UI code never queries the database directly — this is what makes backend-level access control real rather than UI-only.
- **Prisma** as the single data-access layer against Postgres.
- **Object storage** for proof-of-payment images and the chairman's signature; the app stores only the object key/URL.
- **QR/certificate**: on validation, generate a `Certificate` row with an opaque `qr_token`; the QR encodes a verification path containing that token; resolving it requires an authenticated Security/Admin/Landlord session (confirmed, §10.3).
- No background job queue, no message broker, no microservices — unnecessary at this scale. Reminders in later phases can start as a simple daily scheduled function (Vercel Cron) and only need a real queue if volume ever demands it.

## 9. Development Roadmap

Each phase ends with something runnable and testable, per your iterative rule.

- **Phase 0 — Discovery & architecture** *(this document)*.
- **Phase 1 — Foundation.** Repo scaffold, Prisma schema/migrations for the full data model, deployed skeleton, working login for all 4 roles (empty/placeholder dashboards) to prove the auth model end-to-end.
- **Phase 2 — Core estate data.** Admin & Landlord CRUD for Houses, Tenants, Living-space types, Fee configuration; House Code/Tenant Code generation and display.
- **Phase 3 — Payment submission & defaulter visibility.** Auto-generated `TenantDue` per active tenant/year, tenant bank-transfer submission with proof upload, Admin dashboard with the filters and totals from §9 of the spec — this is the phase that delivers the core business objective.
- **Phase 4 — Payment validation.** Admin review queue (validate/reject with notes), cash payment recording, payment history views for Admin/Landlord/Tenant.
- **Phase 5 — Digital certificate.** PDF certificate generation, QR token, gated verification lookup.
- **Phase 6 — Security role.** Search/scan lookup screen, minimal-disclosure status result.
- **Phase 7 — Expected payment date.** Promise-to-pay capture and display, "overdue vs. promised" flag on the Admin dashboard.
- **Phase 8 — Polish & hardening.** Mobile UX pass across all roles, CSV export, login rate-limiting, error-message pass, deployment finalization.

Phases 1–2 and 6–7 are small enough that we may combine adjacent ones once we're moving, but I'll propose that at the time rather than deciding now.

## 10. Decisions — Confirmed by Product Owner (2026-08-17)

1. **Tenant login = House Code + Tenant Code together.** Confirmed.
2. **Admin and Landlord authenticate with phone/email + password**; Tenant and Security use the lighter models described above. Confirmed.
3. **QR/certificate verification requires a Security/Admin/Landlord login.** Confirmed. Rationale from PO: the priority is minimal delay at the gate, and gate scanning is only a fallback — defaulters are already known from the dashboard. Since Security is already logged into the app for the normal lookup flow during their shift, resolving a scanned QR through that same session adds no extra step or delay; it only prevents a stray photograph of a certificate from being resolved by someone with no session at all.
4. **Billing is per active tenant, not per house.** Confirmed.
5. **No proration for mid-year move-ins, and no partial payments — ever, regardless of when the tenant moved in.** Confirmed, stated more strongly than the original proposal: partial payment is out of scope permanently for MVP, not just deferred, and the full annual fee always applies regardless of move-in date.
6. **Landlords can request deactivation of their own tenant; Admin confirms it.** This is a new small workflow, not just a permissions toggle — see the addition to §6 and §9 below.
7. **First Admin provisioning: estate self-registration**, not a seed script. The first Admin completes a one-time "Set up your estate" flow that creates the `Estate` record and their own Admin account together (available only while no `Estate` row exists yet). That Admin then creates Landlord and Security accounts in-app — setting each an initial password — and shares credentials with them out of band (phone call/WhatsApp), with no in-person handoff or self-registration flow needed for those roles. There is no automated email/SMS password reset in MVP: if a Landlord or Security user is locked out, Admin resets their password directly in the app.

---

All Phase 0 decisions are confirmed. Phase 1 begins next.
