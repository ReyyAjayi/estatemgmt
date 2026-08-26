"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// A nav item is a candidate match on its own route and any nested route
// under it (e.g. "Payments" stays highlighted on /admin/payments/review).
// Every item's href shares the role's root prefix ("/admin", "/landlord",
// ...), so the root "Dashboard" link would also prefix-match every other
// page -- only the single longest (most specific) match should actually
// highlight.
function matches(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function NavLinks({ items }: { items: { href: string; label: string }[] }) {
  const pathname = usePathname();
  const activeHref = items
    .filter((item) => matches(pathname, item.href))
    .reduce<string | null>((longest, item) => (!longest || item.href.length > longest.length ? item.href : longest), null);

  return (
    <nav className="flex gap-1 overflow-x-auto px-4 pb-3 text-sm sm:px-6">
      {items.map((item) => {
        const active = item.href === activeHref;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={
              active
                ? "whitespace-nowrap rounded-md bg-slate-900 px-3 py-1.5 font-medium text-white"
                : "whitespace-nowrap rounded-md px-3 py-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
