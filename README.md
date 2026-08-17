# Estate Dues & Resident Management System

An MVP application for managing estate houses, landlords, tenants, security/estate dues, payments and digital payment clearance for a single estate.

The core objective: let estate management see who has paid and who hasn't, so the security gate doesn't have to act as the payment-verification checkpoint.

## Project status

**Phase 0 — Discovery & Architecture**, **Phase 1 — Foundation**, and **Phase 2 — Core Estate Data** are complete.

- Phase 1: estate self-registration, staff (Admin/Landlord/Security) password login, tenant House Code + Tenant Code login, role-protected dashboards, login lockout.
- Phase 2: Admin & Landlord CRUD for houses, tenants, living-space types and fees; House Code/Tenant Code generation and display; Landlord-initiated tenant deactivation requests with Admin confirmation.

No payment submission, validation, or defaulter dashboard yet — that's Phase 3, the phase that delivers the core "who has paid" objective from the product spec.

- [`docs/phase-0-discovery.md`](docs/phase-0-discovery.md) — full requirements analysis, architecture, data model, roles/permissions, screens, roadmap, and open decisions.
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
