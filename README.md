# Estate Dues & Resident Management System

An MVP application for managing estate houses, landlords, tenants, security/estate dues, payments and digital payment clearance for a single estate.

The core objective: let estate management see who has paid and who hasn't, so the security gate doesn't have to act as the payment-verification checkpoint.

## Project status

**Phase 0 — Discovery & Architecture** and **Phase 1 — Foundation** are complete. Phase 1 delivered a working authentication skeleton: estate self-registration, staff (Admin/Landlord/Security) password login, tenant House Code + Tenant Code login, role-protected placeholder dashboards for all four roles, and login lockout after repeated failures. No estate/tenant/payment features yet — that starts in Phase 2.

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

To test the Landlord, Tenant and Security logins (which are normally created by an Admin in-app — a Phase 2 feature not yet built), seed some dev fixtures **after** completing the setup step above:

```bash
npm run db:seed
```

This prints a Landlord login, a Security login, and a House Code + Tenant Code pair to the terminal. It's a dev-only convenience script, not part of the real onboarding flow (see `PRODUCT_DECISIONS.md` #14–15).

Further documentation will be added here as each phase is built.
