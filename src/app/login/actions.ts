"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import { createSession } from "@/lib/session";
import { isLocked, nextLockState } from "@/lib/lockout";
import { Role } from "@/generated/prisma/enums";
import { roleHome } from "@/lib/auth-guard";

export type LoginState = { error: string | null };

const GENERIC_ERROR = "Incorrect details. Please check and try again.";
const LOCKED_ERROR = "Too many failed attempts. Please try again in 15 minutes.";

const staffSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

export async function staffLogin(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const parsed = staffSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: GENERIC_ERROR };
  }

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });

  if (!user || !user.passwordHash || user.status !== "active") {
    return { error: GENERIC_ERROR };
  }

  if (isLocked(user.lockedUntil)) {
    return { error: LOCKED_ERROR };
  }

  const valid = await verifyPassword(parsed.data.password, user.passwordHash);

  if (!valid) {
    const nextState = nextLockState(user.failedLoginAttempts);
    await prisma.user.update({ where: { id: user.id }, data: nextState });
    return {
      error: nextState.lockedUntil ? LOCKED_ERROR : GENERIC_ERROR,
    };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { failedLoginAttempts: 0, lockedUntil: null },
  });

  await createSession({ userId: user.id, role: user.role });
  redirect(roleHome(user.role));
}

const tenantSchema = z.object({
  houseCode: z.string().trim().toUpperCase().min(1),
  tenantCode: z.string().trim().toUpperCase().min(1),
});

export async function tenantLogin(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const parsed = tenantSchema.safeParse({
    houseCode: formData.get("houseCode"),
    tenantCode: formData.get("tenantCode"),
  });
  if (!parsed.success) {
    return { error: GENERIC_ERROR };
  }

  const house = await prisma.house.findUnique({
    where: { houseCode: parsed.data.houseCode },
  });
  if (!house) {
    return { error: GENERIC_ERROR };
  }

  if (isLocked(house.lockedUntil)) {
    return { error: LOCKED_ERROR };
  }

  const tenant = await prisma.tenant.findFirst({
    where: { houseId: house.id, tenantCode: parsed.data.tenantCode },
  });

  // A wrong tenant code can't be pinned on any one Tenant row, so a failed
  // guess counts against the House instead (see the schema comment on House).
  if (!tenant || tenant.status !== "active") {
    const nextState = nextLockState(house.failedLoginAttempts);
    await prisma.house.update({ where: { id: house.id }, data: nextState });
    return { error: nextState.lockedUntil ? LOCKED_ERROR : GENERIC_ERROR };
  }

  // House Code + Tenant Code both matched — this pair, taken together, is the
  // credential (see docs/phase-0-discovery.md §10.1), so a match here is a
  // successful login, not a password to separately verify.
  await prisma.house.update({
    where: { id: house.id },
    data: { failedLoginAttempts: 0, lockedUntil: null },
  });

  await createSession({ userId: tenant.id, role: Role.TENANT, tenantId: tenant.id });
  redirect("/tenant");
}
