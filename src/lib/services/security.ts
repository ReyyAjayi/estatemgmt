import "server-only";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { generateTempPassword } from "@/lib/codes";
import { Role } from "@/generated/prisma/enums";

// Mirrors landlords.ts createLandlord — same "Admin-created in-app,
// temp password shown once" pattern (docs/phase-0-discovery.md §10.7 /
// PRODUCT_DECISIONS.md #15). Deliberately no resetSecurityPassword: per the
// PO, this screen is list + add only, not a full management surface — a
// locked-out guard is handled another way for now, not through this screen.
export function listSecurityAccounts() {
  return prisma.security.findMany({
    orderBy: { fullName: "asc" },
    include: { user: true },
  });
}

export async function createSecurityAccount(input: {
  fullName: string;
  phone: string;
  email: string;
}) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw new Error("A user with that email already exists.");
  }

  const tempPassword = generateTempPassword();
  const passwordHash = await hashPassword(tempPassword);

  const security = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: { role: Role.SECURITY, name: input.fullName, email: input.email, passwordHash },
    });
    return tx.security.create({
      data: { userId: user.id, fullName: input.fullName, phone: input.phone },
    });
  });

  return { security, tempPassword };
}
