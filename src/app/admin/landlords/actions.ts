"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth-guard";
import { Role } from "@/generated/prisma/enums";
import { createLandlord, resetLandlordPassword } from "@/lib/services/landlords";

export type CreateLandlordState = {
  error: string | null;
  created?: { fullName: string; email: string; tempPassword: string };
};

const createSchema = z.object({
  fullName: z.string().trim().min(2, "Name is required."),
  phone: z.string().trim().min(7, "Enter a valid phone number."),
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
});

export async function createLandlordAction(
  _prevState: CreateLandlordState,
  formData: FormData
): Promise<CreateLandlordState> {
  await requireRole([Role.ADMIN]);

  const parsed = createSchema.safeParse({
    fullName: formData.get("fullName"),
    phone: formData.get("phone"),
    email: formData.get("email"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    const { tempPassword } = await createLandlord(parsed.data);
    revalidatePath("/admin/landlords");
    return {
      error: null,
      created: { fullName: parsed.data.fullName, email: parsed.data.email, tempPassword },
    };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not create landlord." };
  }
}

export type ResetPasswordState = { error: string | null; tempPassword?: string };

export async function resetPasswordAction(
  _prevState: ResetPasswordState,
  formData: FormData
): Promise<ResetPasswordState> {
  await requireRole([Role.ADMIN]);

  const landlordId = formData.get("landlordId");
  if (typeof landlordId !== "string" || !landlordId) {
    return { error: "Missing landlord." };
  }

  const { tempPassword } = await resetLandlordPassword(landlordId);
  revalidatePath("/admin/landlords");
  return { error: null, tempPassword };
}
