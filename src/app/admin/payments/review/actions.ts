"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth-guard";
import { Role } from "@/generated/prisma/enums";
import { validatePayment, rejectPayment } from "@/lib/services/payments";

export type ActionState = { error: string | null };

const initial: ActionState = { error: null };

function revalidateAll() {
  revalidatePath("/admin/payments/review");
  revalidatePath("/admin/payments");
  revalidatePath("/admin/payments/history");
  revalidatePath("/admin");
}

export async function validatePaymentAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await requireRole([Role.ADMIN]);
  const paymentId = formData.get("paymentId");
  if (typeof paymentId !== "string" || !paymentId) return initial;

  const notesRaw = formData.get("notes");
  const notes = typeof notesRaw === "string" && notesRaw.trim() ? notesRaw.trim() : null;

  try {
    await validatePayment(session, paymentId, notes);
    revalidateAll();
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not validate payment." };
  }
}

export async function rejectPaymentAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await requireRole([Role.ADMIN]);
  const paymentId = formData.get("paymentId");
  if (typeof paymentId !== "string" || !paymentId) return initial;

  const notesRaw = formData.get("notes");
  const notes = typeof notesRaw === "string" ? notesRaw.trim() : "";

  try {
    await rejectPayment(session, paymentId, notes);
    revalidateAll();
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not reject payment." };
  }
}
