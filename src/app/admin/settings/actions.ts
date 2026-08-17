"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth-guard";
import { Role } from "@/generated/prisma/enums";
import { updateEstateSettings } from "@/lib/services/estate-settings";

export type SettingsState = { error: string | null; success?: boolean };

export async function updateEstateSettingsAction(
  _prevState: SettingsState,
  formData: FormData
): Promise<SettingsState> {
  const session = await requireRole([Role.ADMIN]);

  const chairmanNameRaw = formData.get("chairmanName");
  const chairmanName =
    typeof chairmanNameRaw === "string" && chairmanNameRaw.trim() ? chairmanNameRaw.trim() : null;

  const file = formData.get("signature");
  const signatureFile = file instanceof File && file.size > 0 ? file : null;

  try {
    await updateEstateSettings(session, { chairmanName, signatureFile });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not save settings." };
  }

  revalidatePath("/admin/settings");
  return { error: null, success: true };
}
