"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth-guard";
import { Role } from "@/generated/prisma/enums";
import { getDueForTenantYear } from "@/lib/services/dues";
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
