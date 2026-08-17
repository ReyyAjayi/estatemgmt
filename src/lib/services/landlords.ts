import "server-only";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { generateTempPassword } from "@/lib/codes";
import { Role } from "@/generated/prisma/enums";

export function listLandlords() {
  return prisma.landlord.findMany({
    orderBy: { fullName: "asc" },
    include: { user: true, houses: { select: { id: true } } },
  });
}

export async function createLandlord(input: {
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

  const landlord = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: { role: Role.LANDLORD, name: input.fullName, email: input.email, passwordHash },
    });
    return tx.landlord.create({
      data: { userId: user.id, fullName: input.fullName, phone: input.phone },
    });
  });

  return { landlord, tempPassword };
}

export async function resetLandlordPassword(landlordId: string) {
  const landlord = await prisma.landlord.findUniqueOrThrow({ where: { id: landlordId } });
  const tempPassword = generateTempPassword();
  const passwordHash = await hashPassword(tempPassword);
  await prisma.user.update({
    where: { id: landlord.userId },
    data: { passwordHash, failedLoginAttempts: 0, lockedUntil: null },
  });
  return { tempPassword };
}
