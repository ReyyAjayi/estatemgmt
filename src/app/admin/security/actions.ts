"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth-guard";
import { Role } from "@/generated/prisma/enums";
import { createSecurityAccount, setSecurityAccountStatus } from "@/lib/services/security";

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

export type ToggleStatusState = { error: string | null };

export async function toggleSecurityStatusAction(
  _prevState: ToggleStatusState,
  formData: FormData
): Promise<ToggleStatusState> {
  await requireRole([Role.ADMIN]);

  const securityId = formData.get("securityId");
  const nextStatus = formData.get("nextStatus");
  if (typeof securityId !== "string" || !securityId) {
    return { error: "Missing security account." };
  }
  if (nextStatus !== "active" && nextStatus !== "inactive") {
    return { error: "Invalid status." };
  }

  try {
    await setSecurityAccountStatus(securityId, nextStatus);
    revalidatePath("/admin/security");
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not update status." };
  }
}
