import Link from "next/link";
import { logout } from "@/app/logout/actions";

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Admin",
  LANDLORD: "Landlord",
  TENANT: "Tenant",
  SECURITY: "Security",
};

const NAV_ITEMS: Record<string, { href: string; label: string }[]> = {
  ADMIN: [
    { href: "/admin", label: "Dashboard" },
    { href: "/admin/payments", label: "Payments" },
    { href: "/admin/houses", label: "Houses" },
    { href: "/admin/landlords", label: "Landlords" },
    { href: "/admin/tenants", label: "Tenants" },
    { href: "/admin/space-types", label: "Space types & fees" },
  ],
  LANDLORD: [
    { href: "/landlord", label: "Dashboard" },
    { href: "/landlord/payments", label: "Payments" },
    { href: "/landlord/houses", label: "My houses" },
    { href: "/landlord/tenants", label: "My tenants" },
  ],
  TENANT: [{ href: "/tenant", label: "Dashboard" }],
  SECURITY: [{ href: "/security", label: "Dashboard" }],
};

export function DashboardShell({
  estateName,
  role,
  personName = "",
  children,
}: {
  estateName: string;
  role: string;
  personName?: string;
  children: React.ReactNode;
}) {
  const navItems = NAV_ITEMS[role] ?? [];

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="flex items-center justify-between px-4 py-4 sm:px-6">
          <div>
            <p className="text-sm font-semibold text-slate-900">{estateName}</p>
            <p className="text-xs text-slate-500">
              {ROLE_LABELS[role] ?? role}
              {personName ? ` · ${personName}` : ""}
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
        </div>
        {navItems.length > 1 && (
          <nav className="flex gap-4 overflow-x-auto px-4 pb-3 text-sm sm:px-6">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="whitespace-nowrap text-slate-600 hover:text-slate-900 hover:underline"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        )}
      </header>
      <main className="px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
