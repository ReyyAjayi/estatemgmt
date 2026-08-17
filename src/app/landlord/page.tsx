import { requireRole } from "@/lib/auth-guard";
import { getEstate } from "@/lib/estate";
import { prisma } from "@/lib/prisma";
import { Role } from "@/generated/prisma/enums";
import { DashboardShell } from "@/components/DashboardShell";

export default async function LandlordDashboard() {
  const session = await requireRole([Role.LANDLORD]);
  const estate = await getEstate();
  const landlord = await prisma.landlord.findUniqueOrThrow({
    where: { userId: session.userId },
  });

  return (
    <DashboardShell estateName={estate?.name ?? ""} role="LANDLORD" personName={landlord.fullName}>
      <h1 className="text-2xl font-semibold text-slate-900">Landlord dashboard</h1>
      <p className="mt-2 max-w-2xl text-slate-600">
        You&apos;re signed in as a Landlord. This is a placeholder — Phase 2 adds
        managing your houses and tenants here.
      </p>
    </DashboardShell>
  );
}
