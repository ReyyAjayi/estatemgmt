"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth-guard";
import { Role } from "@/generated/prisma/enums";
import { createHouse } from "@/lib/services/houses";

export type FormState = { error: string | null; houseCode?: string };

const schema = z.object({
  houseNumber: z.string().trim().min(1, "House number is required."),
});

export async function createHouseAction(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const session = await requireRole([Role.LANDLORD]);

  const parsed = schema.safeParse({ houseNumber: formData.get("houseNumber") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    // No landlordId in the form — createHouse() assigns the caller's own
    // Landlord record when the session role is LANDLORD (see src/lib/services/houses.ts).
    const house = await createHouse(session, parsed.data);
    revalidatePath("/landlord/houses");
    return { error: null, houseCode: house.houseCode };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not create house." };
  }
}
