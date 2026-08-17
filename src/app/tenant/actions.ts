"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth-guard";
import { Role } from "@/generated/prisma/enums";
import { getDueForTenantYear, setExpectedPaymentDate } from "@/lib/services/dues";
import { submitBankTransferPayment } from "@/lib/services/payments";
import { saveProofFile } from "@/lib/storage";

export type FormState = { error: string | null; success?: boolean };

export async function submitPaymentAction(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const session = await requireRole([Role.TENANT]);
  if (!session.tenantId) {
    return { error: "Session error. Please log in again." };
  }

  const year = new Date().getFullYear();
  const due = await getDueForTenantYear(session.tenantId, year);
  if (!due) {
    return { error: "No amount due found for this year yet." };
  }

  const referenceNumberRaw = formData.get("referenceNumber");
  const referenceNumber =
    typeof referenceNumberRaw === "string" && referenceNumberRaw.trim()
      ? referenceNumberRaw.trim()
      : null;

  const file = formData.get("proof");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Please attach your proof of payment." };
  }

  try {
    const proofKey = await saveProofFile(file);
    await submitBankTransferPayment(due.id, session.tenantId, { referenceNumber, proofKey });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not submit payment." };
  }

  revalidatePath("/tenant");
  return { error: null, success: true };
}

export type PromiseState = { error: string | null; success?: boolean };

export async function setExpectedPaymentDateAction(
  _prevState: PromiseState,
  formData: FormData
): Promise<PromiseState> {
  const session = await requireRole([Role.TENANT]);
  if (!session.tenantId) {
    return { error: "Session error. Please log in again." };
  }

  const year = new Date().getFullYear();
  const due = await getDueForTenantYear(session.tenantId, year);
  if (!due) {
    return { error: "No amount due found for this year yet." };
  }

  const raw = formData.get("expectedPaymentDate");
  let date: Date | null = null;
  if (typeof raw === "string" && raw.trim()) {
    // Compare as calendar-date strings (YYYY-MM-DD) rather than converting to
    // Date and comparing instants — avoids an off-by-one near midnight in
    // timezones ahead of UTC.
    if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      return { error: "Enter a valid date." };
    }
    const todayStr = new Date().toISOString().slice(0, 10);
    if (raw < todayStr) {
      return { error: "Pick today or a future date." };
    }
    date = new Date(`${raw}T00:00:00.000Z`);
  }

  try {
    await setExpectedPaymentDate(session, due.id, date);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not save that date." };
  }

  revalidatePath("/tenant");
  return { error: null, success: true };
}
