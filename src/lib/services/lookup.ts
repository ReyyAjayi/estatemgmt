import "server-only";
import { prisma } from "@/lib/prisma";

export type ClearanceResult = {
  tenantId: string;
  tenantName: string;
  houseNumber: string;
  clear: boolean;
};

// Security's gate-side lookup (docs/phase-0-discovery.md §7 & §10.3): search
// by house number or tenant code, returning only CLEAR/NOT CLEAR + names —
// never amounts, references, or proof files. A house can have several active
// tenants, so a house-number match returns all of them; a tenant-code match
// is always exactly one tenant. No match on either returns null rather than
// distinguishing "wrong house" from "wrong code," so a search can't be used
// to enumerate what exists.
export async function searchClearanceStatus(
  estateId: string,
  query: string,
  year: number
): Promise<ClearanceResult[] | null> {
  const trimmed = query.trim();
  if (!trimmed) return null;

  const house = await prisma.house.findFirst({
    where: { estateId, houseNumber: { equals: trimmed, mode: "insensitive" } },
    include: {
      tenants: {
        where: { status: "active" },
        include: { dues: { where: { year } } },
        orderBy: { fullName: "asc" },
      },
    },
  });
  if (house) {
    if (house.tenants.length === 0) return [];
    return house.tenants.map((tenant) => ({
      tenantId: tenant.id,
      tenantName: tenant.fullName,
      houseNumber: house.houseNumber,
      clear: tenant.dues[0]?.status === "VALIDATED",
    }));
  }

  const tenant = await prisma.tenant.findFirst({
    where: {
      tenantCode: { equals: trimmed, mode: "insensitive" },
      status: "active",
      house: { estateId },
    },
    include: { house: true, dues: { where: { year } } },
  });
  if (tenant) {
    return [
      {
        tenantId: tenant.id,
        tenantName: tenant.fullName,
        houseNumber: tenant.house.houseNumber,
        clear: tenant.dues[0]?.status === "VALIDATED",
      },
    ];
  }

  return null;
}
