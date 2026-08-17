import "server-only";
import { prisma } from "@/lib/prisma";

export function listLivingSpaceTypes(estateId: string) {
  return prisma.livingSpaceType.findMany({
    where: { estateId, active: true },
    orderBy: { name: "asc" },
  });
}

export function listLivingSpaceTypesWithCurrentFee(estateId: string, year: number) {
  return prisma.livingSpaceType.findMany({
    where: { estateId },
    orderBy: { name: "asc" },
    include: { fees: { where: { year } } },
  });
}

export async function createLivingSpaceType(estateId: string, name: string) {
  const existing = await prisma.livingSpaceType.findUnique({
    where: { estateId_name: { estateId, name } },
  });
  if (existing) {
    throw new Error("A living space type with that name already exists.");
  }
  return prisma.livingSpaceType.create({ data: { estateId, name } });
}
