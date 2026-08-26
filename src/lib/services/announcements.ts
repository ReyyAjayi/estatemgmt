import "server-only";
import { prisma } from "@/lib/prisma";
import type { SessionPayload } from "@/lib/session";
import { sendPushToAllSubscribers } from "./push";

export function listAnnouncements() {
  return prisma.announcement.findMany({
    orderBy: { postedAt: "desc" },
    include: { postedBy: true },
  });
}

export function getLatestAnnouncement() {
  return prisma.announcement.findFirst({ orderBy: { postedAt: "desc" } });
}

// Saves the announcement first, then best-effort pushes it out -- a push
// misconfiguration or a flaky send should never lose the announcement
// itself, since the in-app banner (getLatestAnnouncement) is the reliable
// fallback regardless of whether push reached anyone.
export async function postAnnouncement(session: SessionPayload, message: string) {
  const announcement = await prisma.announcement.create({
    data: { message, postedById: session.userId },
  });

  let pushResult: { sent: number; failed: number } | { error: string };
  try {
    pushResult = await sendPushToAllSubscribers({ title: "Estate announcement", body: message });
  } catch (err) {
    pushResult = { error: err instanceof Error ? err.message : "Could not send push notifications." };
  }

  return { announcement, pushResult };
}
