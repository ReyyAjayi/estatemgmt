import { requireRole } from "@/lib/auth-guard";
import { Role } from "@/generated/prisma/enums";
import { getEstate } from "@/lib/estate";
import { DashboardShell } from "@/components/DashboardShell";
import { SettingsForm } from "./SettingsForm";

export default async function AdminSettingsPage() {
  await requireRole([Role.ADMIN]);
  const estate = await getEstate();

  return (
    <DashboardShell estateName={estate?.name ?? ""} role="ADMIN">
      <h1 className="text-2xl font-semibold text-slate-900">Estate settings</h1>
      <p className="mt-1 max-w-md text-slate-600">
        The chairman name and signature appear on every certificate issued from now on.
      </p>

      <div className="mt-6 rounded-lg border border-slate-200 bg-white p-4">
        <SettingsForm
          currentChairmanName={estate?.chairmanName ?? ""}
          hasSignature={!!estate?.chairmanSignatureUrl}
        />
      </div>
    </DashboardShell>
  );
}
