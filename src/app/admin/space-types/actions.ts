"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth-guard";
import { Role } from "@/generated/prisma/enums";
import { getEstate } from "@/lib/estate";
import { createLivingSpaceType } from "@/lib/services/living-space-types";
import { upsertFee } from "@/lib/services/fees";

export type FormState = { error: string | null };

const createSchema = z.object({
  name: z.string().trim().min(2, "Name is required."),
  year: z.coerce.number().int().min(2000).max(2100),
  amount: z.coerce.number().positive("Fee must be a positive amount."),
});

export async function createSpaceType(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  await requireRole([Role.ADMIN]);

  const estate = await getEstate();
  if (!estate) return { error: "No estate found." };

  const parsed = createSchema.safeParse({
    name: formData.get("name"),
    year: formData.get("year"),
    amount: formData.get("amount"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    const spaceType = await createLivingSpaceType(estate.id, parsed.data.name);
    await upsertFee(spaceType.id, parsed.data.year, parsed.data.amount);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not create space type." };
  }

  revalidatePath("/admin/space-types");
  return { error: null };
}

const feeSchema = z.object({
  livingSpaceTypeId: z.string().min(1),
  year: z.coerce.number().int().min(2000).max(2100),
  amount: z.coerce.number().positive("Fee must be a positive amount."),
});

export async function updateFee(_prevState: FormState, formData: FormData): Promise<FormState> {
  await requireRole([Role.ADMIN]);

  const parsed = feeSchema.safeParse({
    livingSpaceTypeId: formData.get("livingSpaceTypeId"),
    year: formData.get("year"),
    amount: formData.get("amount"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  await upsertFee(parsed.data.livingSpaceTypeId, parsed.data.year, parsed.data.amount);
  revalidatePath("/admin/space-types");
  return { error: null };
}
