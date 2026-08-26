"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth-guard";
import { Role } from "@/generated/prisma/enums";
import { postAnnouncement } from "@/lib/services/announcements";

export type PostAnnouncementState = {
  error: string | null;
  posted?: { sent: number; failed: number; pushError?: string };
};

const schema = z.object({
  message: z.string().trim().min(1, "Write a message before posting.").max(500, "Keep it under 500 characters."),
});

export async function postAnnouncementAction(
  _prevState: PostAnnouncementState,
  formData: FormData
): Promise<PostAnnouncementState> {
  const session = await requireRole([Role.ADMIN]);

  const parsed = schema.safeParse({ message: formData.get("message") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const { pushResult } = await postAnnouncement(session, parsed.data.message);
  revalidatePath("/admin/announcements");

  if ("error" in pushResult) {
    return { error: null, posted: { sent: 0, failed: 0, pushError: pushResult.error } };
  }
  return { error: null, posted: { sent: pushResult.sent, failed: pushResult.failed } };
}
