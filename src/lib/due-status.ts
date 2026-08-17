import type { DueStatus } from "@/generated/prisma/enums";

export const DUE_STATUS_DISPLAY: Record<DueStatus, { label: string; className: string }> = {
  NOT_PAID: { label: "OUTSTANDING", className: "bg-red-100 text-red-800" },
  PAYMENT_SUBMITTED: { label: "SUBMITTED", className: "bg-amber-100 text-amber-800" },
  VALIDATED: { label: "PAID", className: "bg-emerald-100 text-emerald-800" },
  REJECTED: { label: "REJECTED", className: "bg-red-100 text-red-800" },
};

export const DUE_STATUS_OPTIONS: { value: DueStatus; label: string }[] = [
  { value: "NOT_PAID", label: "Outstanding" },
  { value: "PAYMENT_SUBMITTED", label: "Payment submitted" },
  { value: "VALIDATED", label: "Paid" },
  { value: "REJECTED", label: "Rejected" },
];
