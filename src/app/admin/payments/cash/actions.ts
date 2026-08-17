"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth-guard";
import { Role } from "@/generated/prisma/enums";
import { recordCashPayment } from "@/lib/services/payments";

export type RecordCashState = { error: string | null; success?: boolean };

export async function recordCashPaymentAction(
  _prevState: RecordCashState,
  formData: FormData
): Promise<RecordCashState> {
  const session = await requireRole([Role.ADMIN]);
  const tenantDueId = formData.get("tenantDueId");
  if (typeof tenantDueId !== "string" || !tenantDueId) {
    return { error: "Select a tenant." };
  }
  const notesRaw = formData.get("notes");
  const notes = typeof notesRaw === "string" && notesRaw.trim() ? notesRaw.trim() : null;

  try {
    await recordCashPayment(session, tenantDueId, notes);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not record cash payment." };
  }

  revalidatePath("/admin/payments/cash");
  revalidatePath("/admin/payments");
  revalidatePath("/admin/payments/history");
  revalidatePath("/admin");
  return { error: null, success: true };
}
