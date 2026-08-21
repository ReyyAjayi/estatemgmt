import "server-only";
import { prisma } from "@/lib/prisma";
import { generateTenantCode } from "@/lib/codes";
import { Role } from "@/generated/prisma/enums";
import type { SessionPayload } from "@/lib/session";
import { ownLandlordId } from "./viewer-scope";

// ADMIN sees every tenant in the estate; LANDLORD sees only tenants in their
// own houses — see docs/phase-0-discovery.md §6. `status` narrows to just
// "active" or "inactive" tenants; omitted, every tenant is returned.
//
// Always excludes a landlord's own occupied unit (Tenant.userId set — see
// createOwnUnitForLandlord below). Regular tenant rows never have userId
// set, so this is a clean, unambiguous split with no extra flag to keep in
// sync. Landlord-occupied units are broken out separately (see
// listLandlordUnitsForAdmin / getOwnUnitForLandlord) so the committee can
// tell tenant compliance from landlord compliance at a glance, rather than
// having landlord units silently blend into tenant counts.
export async function listTenantsForViewer(
  session: SessionPayload,
  filters: { status?: "active" | "inactive"; houseId?: string } = {}
) {
  const where = {
    userId: null,
    ...(session.role === Role.ADMIN ? {} : { house: { landlordId: await ownLandlordId(session) } }),
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.houseId ? { houseId: filters.houseId } : {}),
  };

  return prisma.tenant.findMany({
    where,
    orderBy: [{ status: "asc" }, { fullName: "asc" }],
    include: { house: { include: { landlord: true } }, livingSpaceType: true },
  });
}

async function assertHouseIsOwnedByViewer(session: SessionPayload, houseId: string) {
  if (session.role === Role.ADMIN) return;
  const house = await prisma.house.findUnique({ where: { id: houseId } });
  if (!house || house.landlordId !== (await ownLandlordId(session))) {
    throw new Error("You can only add tenants to your own houses.");
  }
}

async function uniqueTenantCode(): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateTenantCode();
    const existing = await prisma.tenant.findUnique({ where: { tenantCode: code } });
    if (!existing) return code;
  }
  throw new Error("Could not generate a unique tenant code. Please try again.");
}

export async function createTenant(
  session: SessionPayload,
  input: {
    houseId: string;
    livingSpaceTypeId: string;
    fullName: string;
    phone: string;
    moveInDate: Date;
  }
) {
  await assertHouseIsOwnedByViewer(session, input.houseId);

  const tenantCode = await uniqueTenantCode();
  return prisma.tenant.create({
    data: {
      houseId: input.houseId,
      livingSpaceTypeId: input.livingSpaceTypeId,
      fullName: input.fullName,
      phone: input.phone,
      moveInDate: input.moveInDate,
      tenantCode,
    },
  });
}

// A landlord's own occupied unit is a Tenant row like any other — same
// dues/payment/certificate/gate-lookup machinery, no changes needed to any
// of that pipeline — but linked to the landlord's own User account instead
// of left unlinked, so they manage it from their existing Landlord login
// rather than a separate House Code + Tenant Code. Not every landlord
// occupies their own house, so this is opt-in, not automatic.
export async function getOwnUnitForLandlord(session: SessionPayload) {
  return prisma.tenant.findFirst({
    where: { userId: session.userId },
    include: { house: true, livingSpaceType: true },
  });
}

export async function createOwnUnitForLandlord(
  session: SessionPayload,
  input: { houseId: string; livingSpaceTypeId: string; moveInDate: Date }
) {
  if (session.role !== Role.LANDLORD) {
    throw new Error("Only a landlord can add their own unit.");
  }
  await assertHouseIsOwnedByViewer(session, input.houseId);

  const existing = await getOwnUnitForLandlord(session);
  if (existing) {
    throw new Error("You already have a unit registered.");
  }

  const landlord = await prisma.landlord.findUniqueOrThrow({ where: { userId: session.userId } });
  const tenantCode = await uniqueTenantCode();

  return prisma.tenant.create({
    data: {
      houseId: input.houseId,
      livingSpaceTypeId: input.livingSpaceTypeId,
      fullName: landlord.fullName,
      phone: landlord.phone,
      moveInDate: input.moveInDate,
      tenantCode,
      userId: session.userId,
    },
  });
}

async function getOwnedTenantOrThrow(session: SessionPayload, tenantId: string) {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, include: { house: true } });
  if (!tenant) throw new Error("Tenant not found.");
  if (session.role === Role.LANDLORD && tenant.house.landlordId !== (await ownLandlordId(session))) {
    throw new Error("You can only manage your own tenants.");
  }
  return tenant;
}

// Landlord-initiated request; only Admin can actually deactivate — see
// docs/phase-0-discovery.md §10.6 and the Tenant model comment in schema.prisma.
export async function requestTenantDeactivation(session: SessionPayload, tenantId: string) {
  const tenant = await getOwnedTenantOrThrow(session, tenantId);
  if (tenant.status !== "active") {
    throw new Error("This tenant is already inactive.");
  }
  return prisma.tenant.update({
    where: { id: tenantId },
    data: { deactivationRequestedAt: new Date(), deactivationRequestedById: session.userId },
  });
}

export async function deactivateTenant(session: SessionPayload, tenantId: string) {
  if (session.role !== Role.ADMIN) {
    throw new Error("Only Admin can deactivate a tenant.");
  }
  return prisma.tenant.update({
    where: { id: tenantId },
    data: {
      status: "inactive",
      moveOutDate: new Date(),
      deactivationRequestedAt: null,
      deactivationRequestedById: null,
    },
  });
}

export async function dismissDeactivationRequest(session: SessionPayload, tenantId: string) {
  if (session.role !== Role.ADMIN) {
    throw new Error("Only Admin can dismiss a deactivation request.");
  }
  return prisma.tenant.update({
    where: { id: tenantId },
    data: { deactivationRequestedAt: null, deactivationRequestedById: null },
  });
}
