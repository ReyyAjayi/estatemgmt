import "server-only";
import { prisma } from "@/lib/prisma";
import { nairaToKobo } from "@/lib/currency";

export function upsertFee(livingSpaceTypeId: string, year: number, amountNaira: number) {
  const amount = nairaToKobo(amountNaira);
  return prisma.fee.upsert({
    where: { livingSpaceTypeId_year: { livingSpaceTypeId, year } },
    create: { livingSpaceTypeId, year, amount },
    update: { amount },
  });
}
