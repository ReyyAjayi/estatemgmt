import Link from "next/link";

type Tab = { href: string; label: string; key: string; badge?: number };

export function PaymentsSubNav({
  role,
  active,
  pendingCount,
}: {
  role: "ADMIN" | "LANDLORD";
  active: "dashboard" | "review" | "cash" | "history";
  pendingCount?: number;
}) {
  const tabs: Tab[] =
    role === "ADMIN"
      ? [
          { href: "/admin/payments", label: "Dashboard", key: "dashboard" },
          { href: "/admin/payments/review", label: "Review queue", key: "review", badge: pendingCount },
          { href: "/admin/payments/cash", label: "Record cash", key: "cash" },
          { href: "/admin/payments/history", label: "History", key: "history" },
        ]
      : [
          { href: "/landlord/payments", label: "Dashboard", key: "dashboard" },
          { href: "/landlord/payments/history", label: "History", key: "history" },
        ];

  return (
    <div className="mt-4 flex flex-wrap gap-2 border-b border-slate-200 pb-3">
      {tabs.map((tab) => (
        <Link
          key={tab.key}
          href={tab.href}
          className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium ${
            tab.key === active
              ? "bg-slate-900 text-white"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          {tab.label}
          {!!tab.badge && (
            <span
              className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-xs font-semibold ${
                tab.key === active ? "bg-white text-slate-900" : "bg-amber-100 text-amber-800"
              }`}
            >
              {tab.badge}
            </span>
          )}
        </Link>
      ))}
    </div>
  );
}
