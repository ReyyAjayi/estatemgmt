import type { DueStatus } from "@/generated/prisma/enums";

export type PromiseBadge = { label: string; className: string };

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

// Only meaningful while a due is still outstanding (NOT_PAID/REJECTED) — once
// paid or under review, "will you pay by X" no longer applies. Returns null
// for any other status so callers can render "—" without a status check of
// their own. See docs/phase-0-discovery.md §8, Phase 7: "overdue vs.
// promised" flag.
export function describePromiseStatus(due: {
  status: DueStatus;
  expectedPaymentDate: Date | null;
}): PromiseBadge | null {
  if (due.status !== "NOT_PAID" && due.status !== "REJECTED") return null;

  if (!due.expectedPaymentDate) {
    return { label: "No promise given", className: "bg-slate-100 text-slate-600" };
  }

  const today = startOfDay(new Date());
  const promised = startOfDay(due.expectedPaymentDate);
  const dateLabel = due.expectedPaymentDate.toLocaleDateString();

  if (promised >= today) {
    return { label: `Promised by ${dateLabel}`, className: "bg-blue-100 text-blue-800" };
  }
  return { label: `Overdue — promised ${dateLabel}`, className: "bg-red-100 text-red-800" };
}

// Same NOT_PAID/REJECTED-only rule as above, without the display strings —
// used for the dashboard's overdue count (no promise, or a broken one).
export function isOverdue(due: { status: DueStatus; expectedPaymentDate: Date | null }): boolean {
  if (due.status !== "NOT_PAID" && due.status !== "REJECTED") return false;
  if (!due.expectedPaymentDate) return true;
  return startOfDay(due.expectedPaymentDate) < startOfDay(new Date());
}
