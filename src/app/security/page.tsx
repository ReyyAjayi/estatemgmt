import { requireRole } from "@/lib/auth-guard";
import { getEstate } from "@/lib/estate";
import { prisma } from "@/lib/prisma";
import { Role } from "@/generated/prisma/enums";
import { DashboardShell } from "@/components/DashboardShell";

export default async function SecurityDashboard() {
  const session = await requireRole([Role.SECURITY]);
  const estate = await getEstate();
  const security = await prisma.security.findUniqueOrThrow({
    where: { userId: session.userId },
  });

  return (
    <DashboardShell estateName={estate?.name ?? ""} role="SECURITY" personName={security.fullName}>
      <h1 className="text-2xl font-semibold text-slate-900">Security lookup</h1>
      <p className="mt-2 max-w-2xl text-slate-600">
        You&apos;re signed in as Security. This is a placeholder — Phase 6 adds the
        house/tenant lookup and QR verification here.
      </p>
    </DashboardShell>
  );
}
