"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth-guard";
import { Role } from "@/generated/prisma/enums";
import { createAdminAccount, resetAdminPassword } from "@/lib/services/admins";

export type CreateAdminState = {
  error: string | null;
  created?: { fullName: string; email: string; tempPassword: string };
};

const createSchema = z.object({
  fullName: z.string().trim().min(2, "Name is required."),
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
});

export async function createAdminAction(
  _prevState: CreateAdminState,
  formData: FormData
): Promise<CreateAdminState> {
  await requireRole([Role.ADMIN]);

  const parsed = createSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    const { tempPassword } = await createAdminAccount(parsed.data);
    revalidatePath("/admin/admins");
    return {
      error: null,
      created: { fullName: parsed.data.fullName, email: parsed.data.email, tempPassword },
    };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not create admin." };
  }
}

export type ResetPasswordState = { error: string | null; tempPassword?: string };

export async function resetPasswordAction(
  _prevState: ResetPasswordState,
  formData: FormData
): Promise<ResetPasswordState> {
  await requireRole([Role.ADMIN]);

  const userId = formData.get("userId");
  if (typeof userId !== "string" || !userId) {
    return { error: "Missing admin." };
  }

  try {
    const { tempPassword } = await resetAdminPassword(userId);
    revalidatePath("/admin/admins");
    return { error: null, tempPassword };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not reset password." };
  }
}
