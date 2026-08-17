import "server-only";
import { prisma } from "@/lib/prisma";
import { generateHouseCode } from "@/lib/codes";
import { Role } from "@/generated/prisma/enums";
import type { SessionPayload } from "@/lib/session";
import { ownLandlordId } from "./viewer-scope";

// ADMIN sees every house in the estate; LANDLORD sees only their own — see
// docs/phase-0-discovery.md §6. Enforced here, not just by which page links here.
export async function listHousesForViewer(session: SessionPayload) {
  const where =
    session.role === Role.ADMIN ? {} : { landlordId: await ownLandlordId(session) };

  return prisma.house.findMany({
    where,
    orderBy: { houseNumber: "asc" },
    include: { landlord: true, tenants: { select: { id: true, status: true } } },
  });
}

export async function getHouseForViewer(session: SessionPayload, houseId: string) {
  const house = await prisma.house.findUnique({
    where: { id: houseId },
    include: { landlord: true, tenants: { include: { livingSpaceType: true } } },
  });
  if (!house) return null;

  if (session.role === Role.LANDLORD && house.landlordId !== (await ownLandlordId(session))) {
    return null;
  }
  return house;
}

async function uniqueHouseCode(): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateHouseCode();
    const existing = await prisma.house.findUnique({ where: { houseCode: code } });
    if (!existing) return code;
  }
  throw new Error("Could not generate a unique house code. Please try again.");
}

export async function createHouse(
  session: SessionPayload,
  input: { houseNumber: string; landlordId?: string }
) {
  const estate = await prisma.estate.findFirstOrThrow();

  const landlordId =
    session.role === Role.ADMIN ? input.landlordId : await ownLandlordId(session);
  if (!landlordId) {
    throw new Error("Select a landlord for this house.");
  }

  const existing = await prisma.house.findUnique({
    where: { estateId_houseNumber: { estateId: estate.id, houseNumber: input.houseNumber } },
  });
  if (existing) {
    throw new Error("A house with that number already exists.");
  }

  const houseCode = await uniqueHouseCode();
  return prisma.house.create({
    data: { estateId: estate.id, landlordId, houseNumber: input.houseNumber, houseCode },
  });
}
