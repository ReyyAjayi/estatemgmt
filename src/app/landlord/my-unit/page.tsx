import Link from "next/link";
import { requireRole } from "@/lib/auth-guard";
import { getEstate } from "@/lib/estate";
import { prisma } from "@/lib/prisma";
import { Role } from "@/generated/prisma/enums";
import { getOwnUnitForLandlord } from "@/lib/services/tenants";
import { listHousesForViewer } from "@/lib/services/houses";
import { listLivingSpaceTypes } from "@/lib/services/living-space-types";
import { ensureDuesForYear, getDueForTenantYear } from "@/lib/services/dues";
import { formatNaira } from "@/lib/currency";
import { describePromiseStatus } from "@/lib/promise-status";
import { DashboardShell } from "@/components/DashboardShell";
import { AddOwnUnitForm } from "./AddOwnUnitForm";
import { SubmitPaymentForm } from "./SubmitPaymentForm";
import { ExpectedPaymentDateForm } from "./ExpectedPaymentDateForm";

const STATUS_DISPLAY: Record<string, { label: string; className: string }> = {
  NOT_PAID: { label: "OUTSTANDING", className: "bg-red-100 text-red-800" },
  PAYMENT_SUBMITTED: {
    label: "SUBMITTED — AWAITING REVIEW",
    className: "bg-amber-100 text-amber-800",
  },
  VALIDATED: { label: "PAID", className: "bg-emerald-100 text-emerald-800" },
  REJECTED: { label: "REJECTED — PLEASE RESUBMIT", className: "bg-red-100 text-red-800" },
};

export default async function LandlordMyUnitPage() {
  const session = await requireRole([Role.LANDLORD]);
  const estate = await getEstate();
  const landlord = await prisma.landlord.findUniqueOrThrow({ where: { userId: session.userId } });

  const tenant = await getOwnUnitForLandlord(session);

  if (!tenant) {
    const [houses, spaceTypes] = await Promise.all([
      listHousesForViewer(session),
      estate ? listLivingSpaceTypes(estate.id) : Promise.resolve([]),
    ]);

    return (
      <DashboardShell estateName={estate?.name ?? ""} role="LANDLORD" personName={landlord.fullName}>
        <h1 className="text-2xl font-semibold text-slate-900">My unit</h1>
        <p className="mt-1 max-w-md text-slate-600">
          If you live in one of your own houses, add it here to track and pay your own estate due
          the same way your tenants do — from this dashboard, not a separate login.
        </p>

        <div className="mt-6 max-w-lg rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-slate-900">Add my unit</h2>
          <p className="mt-1 text-sm text-slate-600">
            Only needed if you actually occupy a unit in one of your houses — skip this if you
            don&apos;t.
          </p>
          <div className="mt-3">
            <AddOwnUnitForm
              houses={houses.map((h) => ({ id: h.id, houseNumber: h.houseNumber }))}
              spaceTypes={spaceTypes.map((t) => ({ id: t.id, name: t.name }))}
            />
          </div>
        </div>
      </DashboardShell>
    );
  }

  const year = new Date().getFullYear();
  if (estate) {
    await ensureDuesForYear(estate.id, year);
  }
  const due = await getDueForTenantYear(tenant.id, year);
  const status = due ? STATUS_DISPLAY[due.status] : null;
  const canSubmit = due && (due.status === "NOT_PAID" || due.status === "REJECTED");
  const promise = due ? describePromiseStatus(due) : null;

  return (
    <DashboardShell estateName={estate?.name ?? ""} role="LANDLORD" personName={landlord.fullName}>
      <h1 className="text-2xl font-semibold text-slate-900">
        My unit — House {tenant.house.houseNumber}
      </h1>

      {due && status ? (
        <div className="mt-6 max-w-md rounded-lg border border-slate-200 bg-white p-6">
          <span
            className={`inline-block rounded-full px-3 py-1 text-sm font-semibold ${status.className}`}
          >
            {status.label}
          </span>
          <p className="mt-4 text-3xl font-semibold text-slate-900">{formatNaira(due.amount)}</p>
          <p className="text-sm text-slate-600">{year} estate due</p>
          {promise && (
            <span
              className={`mt-3 inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${promise.className}`}
            >
              {promise.label}
            </span>
          )}
          {due.status === "VALIDATED" && (
            <Link
              href="/landlord/my-unit/certificate"
              className="mt-4 inline-block rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            >
              View certificate
            </Link>
          )}
        </div>
      ) : (
        <p className="mt-6 max-w-md text-slate-600">
          Your {year} due hasn&apos;t been set up yet — check back soon.
        </p>
      )}

      {canSubmit && (
        <div className="mt-8 max-w-md rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-slate-900">Submit payment</h2>
          <p className="mt-1 text-sm text-slate-600">
            Pay by bank transfer, then upload your proof of payment below.
          </p>
          <div className="mt-3">
            <SubmitPaymentForm />
          </div>
        </div>
      )}

      {canSubmit && (
        <div className="mt-4 max-w-md rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-slate-900">Not ready yet?</h2>
          <p className="mt-1 text-sm text-slate-600">Let the estate know when you plan to pay.</p>
          <ExpectedPaymentDateForm
            currentDate={
              due?.expectedPaymentDate ? due.expectedPaymentDate.toISOString().slice(0, 10) : null
            }
          />
        </div>
      )}
    </DashboardShell>
  );
}
