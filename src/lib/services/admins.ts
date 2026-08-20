import "server-only";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { generateTempPassword } from "@/lib/codes";
import { Role } from "@/generated/prisma/enums";

// Admin has no separate profile table (see schema.prisma's note on User.name)
// -- unlike Landlord/Security, everything lives directly on User.
//
// Exists so an Estate is never one lost password away from being
// permanently unrecoverable: /setup only ever runs once (see
// src/app/setup/actions.ts), so before this, a locked-out sole Admin had no
// in-app path back in at all. Any Admin can create or reset any other
// Admin -- same full-trust model already used for Landlord/Security.
export function listAdminAccounts() {
  return prisma.user.findMany({
    where: { role: Role.ADMIN },
    orderBy: { name: "asc" },
  });
}

export async function createAdminAccount(input: { fullName: string; email: string }) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw new Error("A user with that email already exists.");
  }

  const tempPassword = generateTempPassword();
  const passwordHash = await hashPassword(tempPassword);

  const user = await prisma.user.create({
    data: { role: Role.ADMIN, name: input.fullName, email: input.email, passwordHash },
  });

  return { user, tempPassword };
}

export async function resetAdminPassword(userId: string) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (user.role !== Role.ADMIN) {
    throw new Error("That account is not an Admin.");
  }

  const tempPassword = generateTempPassword();
  const passwordHash = await hashPassword(tempPassword);
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash, failedLoginAttempts: 0, lockedUntil: null },
  });
  return { tempPassword };
}
