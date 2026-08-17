import "server-only";
import { prisma } from "@/lib/prisma";
import type { SessionPayload } from "@/lib/session";

export async function ownLandlordId(session: SessionPayload): Promise<string> {
  const landlord = await prisma.landlord.findUniqueOrThrow({
    where: { userId: session.userId },
  });
  return landlord.id;
}
