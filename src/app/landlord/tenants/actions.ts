"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth-guard";
import { Role } from "@/generated/prisma/enums";
import { createTenant, requestTenantDeactivation } from "@/lib/services/tenants";

export type CreateTenantState = { error: string | null; tenantCode?: string };

const createSchema = z.object({
  houseId: z.string().trim().min(1, "Select a house."),
  livingSpaceTypeId: z.string().trim().min(1, "Select a living space type."),
  fullName: z.string().trim().min(2, "Name is required."),
  phone: z.string().trim().min(7, "Enter a valid phone number."),
  moveInDate: z.string().trim().min(1, "Move-in date is required."),
});

export async function createTenantAction(
  _prevState: CreateTenantState,
  formData: FormData
): Promise<CreateTenantState> {
  const session = await requireRole([Role.LANDLORD]);

  const parsed = createSchema.safeParse({
    houseId: formData.get("houseId"),
    livingSpaceTypeId: formData.get("livingSpaceTypeId"),
    fullName: formData.get("fullName"),
    phone: formData.get("phone"),
    moveInDate: formData.get("moveInDate"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    const tenant = await createTenant(session, {
      ...parsed.data,
      moveInDate: new Date(parsed.data.moveInDate),
    });
    revalidatePath("/landlord/tenants");
    return { error: null, tenantCode: tenant.tenantCode };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not add tenant." };
  }
}

export type ActionState = { error: string | null };

export async function requestDeactivationAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await requireRole([Role.LANDLORD]);
  const tenantId = formData.get("tenantId");
  if (typeof tenantId !== "string" || !tenantId) return { error: "Missing tenant." };

  try {
    await requestTenantDeactivation(session, tenantId);
    revalidatePath("/landlord/tenants");
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not request deactivation." };
  }
}
