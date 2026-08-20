"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth-guard";
import { Role } from "@/generated/prisma/enums";
import { createOwnUnitForLandlord, getOwnUnitForLandlord } from "@/lib/services/tenants";
import { getDueForTenantYear, setExpectedPaymentDate } from "@/lib/services/dues";
import { submitBankTransferPayment } from "@/lib/services/payments";
import { saveProofFile } from "@/lib/storage";

export type AddOwnUnitState = { error: string | null };

const addUnitSchema = z.object({
  houseId: z.string().trim().min(1, "Select a house."),
  livingSpaceTypeId: z.string().trim().min(1, "Select a living space type."),
  moveInDate: z.string().trim().min(1, "Move-in date is required."),
});

export async function addOwnUnitAction(
  _prevState: AddOwnUnitState,
  formData: FormData
): Promise<AddOwnUnitState> {
  const session = await requireRole([Role.LANDLORD]);

  const parsed = addUnitSchema.safeParse({
    houseId: formData.get("houseId"),
    livingSpaceTypeId: formData.get("livingSpaceTypeId"),
    moveInDate: formData.get("moveInDate"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    await createOwnUnitForLandlord(session, {
      ...parsed.data,
      moveInDate: new Date(parsed.data.moveInDate),
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not add your unit." };
  }

  revalidatePath("/landlord/my-unit");
  return { error: null };
}

export type FormState = { error: string | null; success?: boolean };

export async function submitOwnUnitPaymentAction(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const session = await requireRole([Role.LANDLORD]);

  const tenant = await getOwnUnitForLandlord(session);
  if (!tenant) {
    return { error: "You haven't added your own unit yet." };
  }

  const year = new Date().getFullYear();
  const due = await getDueForTenantYear(tenant.id, year);
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
    await submitBankTransferPayment(due.id, tenant.id, { referenceNumber, proofKey });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not submit payment." };
  }

  revalidatePath("/landlord/my-unit");
  return { error: null, success: true };
}

export type PromiseState = { error: string | null; success?: boolean };

export async function setOwnUnitExpectedPaymentDateAction(
  _prevState: PromiseState,
  formData: FormData
): Promise<PromiseState> {
  const session = await requireRole([Role.LANDLORD]);

  const tenant = await getOwnUnitForLandlord(session);
  if (!tenant) {
    return { error: "You haven't added your own unit yet." };
  }

  const year = new Date().getFullYear();
  const due = await getDueForTenantYear(tenant.id, year);
  if (!due) {
    return { error: "No amount due found for this year yet." };
  }

  const raw = formData.get("expectedPaymentDate");
  let date: Date | null = null;
  if (typeof raw === "string" && raw.trim()) {
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
    await setExpectedPaymentDate(tenant.id, due.id, date);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not save that date." };
  }

  revalidatePath("/landlord/my-unit");
  return { error: null, success: true };
}
