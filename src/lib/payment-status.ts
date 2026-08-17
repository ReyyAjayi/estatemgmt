import type { PaymentStatus } from "@/generated/prisma/enums";

export const PAYMENT_STATUS_DISPLAY: Record<PaymentStatus, { label: string; className: string }> = {
  SUBMITTED: { label: "Awaiting review", className: "bg-amber-100 text-amber-800" },
  VALIDATED: { label: "Validated", className: "bg-emerald-100 text-emerald-800" },
  REJECTED: { label: "Rejected", className: "bg-red-100 text-red-800" },
};

export const PAYMENT_STATUS_OPTIONS: { value: PaymentStatus; label: string }[] = [
  { value: "SUBMITTED", label: "Awaiting review" },
  { value: "VALIDATED", label: "Validated" },
  { value: "REJECTED", label: "Rejected" },
];
