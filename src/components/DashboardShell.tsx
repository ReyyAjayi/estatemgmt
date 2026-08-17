import { logout } from "@/app/logout/actions";

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Admin",
  LANDLORD: "Landlord",
  TENANT: "Tenant",
  SECURITY: "Security",
};

export function DashboardShell({
  estateName,
  role,
  personName,
  children,
}: {
  estateName: string;
  role: string;
  personName: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
        <div>
          <p className="text-sm font-semibold text-slate-900">{estateName}</p>
          <p className="text-xs text-slate-500">
            {ROLE_LABELS[role] ?? role} · {personName}
          </p>
        </div>
        <form action={logout}>
          <button
            type="submit"
            className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            Log out
          </button>
        </form>
      </header>
      <main className="px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
