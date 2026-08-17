"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { createSession } from "@/lib/session";
import { Role } from "@/generated/prisma/enums";

const setupSchema = z
  .object({
    estateName: z.string().trim().min(2, "Estate name is required."),
    adminName: z.string().trim().min(2, "Your name is required."),
    adminEmail: z.string().trim().toLowerCase().email("Enter a valid email address."),
    password: z.string().min(8, "Password must be at least 8 characters."),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export type SetupState = { error: string | null };

export async function setupEstate(
  _prevState: SetupState,
  formData: FormData
): Promise<SetupState> {
  // Re-check at execution time, not just when the page loaded — closes the
  // window where two people could submit the setup form concurrently.
  const existing = await prisma.estate.findFirst();
  if (existing) {
    redirect("/login");
  }

  const parsed = setupSchema.safeParse({
    estateName: formData.get("estateName"),
    adminName: formData.get("adminName"),
    adminEmail: formData.get("adminEmail"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const { estateName, adminName, adminEmail, password } = parsed.data;

  const passwordHash = await hashPassword(password);

  const { user } = await prisma.$transaction(async (tx) => {
    await tx.estate.create({ data: { name: estateName } });
    const createdUser = await tx.user.create({
      data: {
        role: Role.ADMIN,
        name: adminName,
        email: adminEmail,
        passwordHash,
      },
    });
    return { user: createdUser };
  });

  await createSession({ userId: user.id, role: Role.ADMIN });
  redirect("/admin");
}
