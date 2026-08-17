"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth-guard";
import { Role } from "@/generated/prisma/enums";
import { createSecurityAccount } from "@/lib/services/security";

export type CreateSecurityState = {
  error: string | null;
  created?: { fullName: string; email: string; tempPassword: string };
};

const createSchema = z.object({
  fullName: z.string().trim().min(2, "Name is required."),
  phone: z.string().trim().min(7, "Enter a valid phone number."),
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
});

export async function createSecurityAction(
  _prevState: CreateSecurityState,
  formData: FormData
): Promise<CreateSecurityState> {
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
    const { tempPassword } = await createSecurityAccount(parsed.data);
    revalidatePath("/admin/security");
    return {
      error: null,
      created: { fullName: parsed.data.fullName, email: parsed.data.email, tempPassword },
    };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not create security account." };
  }
}
