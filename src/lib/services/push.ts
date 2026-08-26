import "server-only";
import webpush from "web-push";
import { prisma } from "@/lib/prisma";
import { Role } from "@/generated/prisma/enums";

const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const privateKey = process.env.VAPID_PRIVATE_KEY;
const contactEmail = process.env.VAPID_CONTACT_EMAIL;

if (publicKey && privateKey && contactEmail) {
  webpush.setVapidDetails(`mailto:${contactEmail}`, publicKey, privateKey);
}

// endpoint is the real identity of a subscription (unique per browser
// installation), so re-subscribing from the same device -- a fresh
// "Enable notifications" click, a rotated push token, whatever -- safely
// upserts instead of piling up duplicate rows for one device.
export async function saveSubscription(input: {
  endpoint: string;
  p256dh: string;
  auth: string;
  role: Role;
  subjectId: string;
}) {
  return prisma.pushSubscription.upsert({
    where: { endpoint: input.endpoint },
    create: input,
    update: { p256dh: input.p256dh, auth: input.auth, role: input.role, subjectId: input.subjectId },
  });
}

// Broadcasts to every stored subscription -- v1 has no per-role targeting
// (see the schema comment on PushSubscription). A subscription whose push
// service reports it gone (404/410 -- uninstalled, permission revoked,
// browser data cleared) is deleted rather than retried forever.
export async function sendPushToAllSubscribers(payload: { title: string; body: string; url?: string }) {
  if (!publicKey || !privateKey || !contactEmail) {
    throw new Error(
      "Push notifications aren't configured (missing VAPID env vars) -- the announcement was still saved."
    );
  }

  const subscriptions = await prisma.pushSubscription.findMany();
  if (subscriptions.length === 0) {
    return { sent: 0, failed: 0 };
  }

  const results = await Promise.allSettled(
    subscriptions.map((sub) =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify(payload)
      )
    )
  );

  const expiredIds: string[] = [];
  let sent = 0;
  let failed = 0;
  results.forEach((result, i) => {
    if (result.status === "fulfilled") {
      sent++;
      return;
    }
    failed++;
    const statusCode = (result.reason as { statusCode?: number })?.statusCode;
    if (statusCode === 404 || statusCode === 410) {
      expiredIds.push(subscriptions[i].id);
    }
  });

  if (expiredIds.length > 0) {
    await prisma.pushSubscription.deleteMany({ where: { id: { in: expiredIds } } });
  }

  return { sent, failed };
}
